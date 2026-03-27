// app/api/sentiment/route.ts
// Placeholder — will be wired to Gemini sentiment analysis
// Returns dummy data until you implement it in a later session

import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { analyzeSentiment } from '@/lib/gemini'

export async function POST(req: Request) {
  try {
    const { userId: clerkUserId } = auth()
    if (!clerkUserId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { meetingId } = await req.json()
    if (!meetingId) {
      return NextResponse.json({ success: false, error: 'meetingId is required' }, { status: 400 })
    }

    const user = await prisma.user.findUnique({ where: { clerkUserId } })
    if (!user) return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 })

    const meeting = await prisma.meeting.findFirst({
      where: { id: meetingId, project: { ownerId: user.id } },
      include: { segments: { orderBy: { sequence: 'asc' } } },
    })

    if (!meeting) {
      return NextResponse.json({ success: false, error: 'Meeting not found' }, { status: 404 })
    }

    const transcriptText = meeting.segments
      .map((s) => `${s.speaker}: ${s.text}`)
      .join('\n')

    // Call Gemini for sentiment
    const sentimentData = await analyzeSentiment(transcriptText)

    // Save sentiment records
    await prisma.$transaction(async (tx) => {
      await tx.sentiment.deleteMany({ where: { meetingId } })

      const firstSegment = meeting.segments[0]
      if (firstSegment && sentimentData.length) {
        await tx.sentiment.createMany({
          data: sentimentData.map((s) => ({
            segmentId: firstSegment.id, // simplified — full RAG links segment by segment
            meetingId,
            speaker: s.speaker,
            sentimentScore: s.score,
            sentimentLabel: s.sentiment,
          })),
        })
      }
    })

    return NextResponse.json({ success: true, data: sentimentData })

  } catch (err: any) {
    console.error('[POST /api/sentiment]', err)
    return NextResponse.json(
      { success: false, error: err.message ?? 'Sentiment analysis failed' },
      { status: 500 }
    )
  }
}
