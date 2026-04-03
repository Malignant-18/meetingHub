import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

import { analyzeSentiment } from '@/lib/gemini'
import { prisma } from '@/lib/prisma'
import {
  buildTranscriptText,
  mapSentimentSegmentsToRecords,
  summarizeProjectSentiment,
} from '@/lib/project-insights'

export async function POST(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { userId: clerkUserId } = auth()
    if (!clerkUserId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const user = await prisma.user.findUnique({ where: { clerkUserId } })
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      )
    }

    const project = await prisma.project.findFirst({
      where: { id: params.id, ownerId: user.id },
      include: {
        meetings: {
          include: {
            segments: { orderBy: { sequence: 'asc' } },
            sentiments: true,
            decisions: true,
            actionItems: true,
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    })

    if (!project) {
      return NextResponse.json(
        { success: false, error: 'Project not found' },
        { status: 404 }
      )
    }

    const meetingsWithContent = project.meetings.filter(
      (meeting) => meeting.segments.length > 0
    )

    if (meetingsWithContent.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'This project does not have any transcript content yet',
        },
        { status: 400 }
      )
    }

    for (const meeting of meetingsWithContent) {
      const transcriptText = buildTranscriptText(meeting.segments)
      const analyzedSegments = await analyzeSentiment(transcriptText)
      const records = mapSentimentSegmentsToRecords(meeting.segments, analyzedSegments)

      await prisma.$transaction(async (tx) => {
        await tx.sentiment.deleteMany({ where: { meetingId: meeting.id } })

        if (records.length > 0) {
          await tx.sentiment.createMany({
            data: records.map((record) => ({
              meetingId: meeting.id,
              segmentId: record.segmentId,
              speaker: record.speaker,
              sentimentLabel: record.sentimentLabel,
              sentimentScore: record.sentimentScore,
            })),
          })
        }
      })
    }

    const refreshedProject = await prisma.project.findFirst({
      where: { id: params.id, ownerId: user.id },
      include: {
        meetings: {
          include: {
            decisions: true,
            actionItems: true,
            sentiments: {
              orderBy: { createdAt: 'desc' },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    })

    if (!refreshedProject) {
      return NextResponse.json(
        { success: false, error: 'Project not found after sentiment analysis' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: summarizeProjectSentiment(refreshedProject.meetings),
    })
  } catch (err: any) {
    console.error(`[POST /api/projects/${params.id}/sentiment]`, err)
    return NextResponse.json(
      { success: false, error: err.message ?? 'Sentiment analysis failed' },
      { status: 500 }
    )
  }
}
