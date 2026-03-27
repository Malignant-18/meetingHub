// app/api/analyze/route.ts
// Calls Gemini to extract decisions + action items from a meeting transcript
// Saves results to Postgres

import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { extractDecisionsAndActions } from '@/lib/gemini'

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

    // Verify ownership
    const user = await prisma.user.findUnique({ where: { clerkUserId } })
    if (!user) return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 })

    const meeting = await prisma.meeting.findFirst({
      where: { id: meetingId, project: { ownerId: user.id } },
      include: { segments: { orderBy: { sequence: 'asc' } } },
    })

    if (!meeting) {
      return NextResponse.json({ success: false, error: 'Meeting not found' }, { status: 404 })
    }

    // Build transcript text from segments
    const transcriptText = meeting.segments
      .map((s) => `${s.speaker}: ${s.text}`)
      .join('\n')

    if (!transcriptText.trim()) {
      return NextResponse.json({ success: false, error: 'No transcript content found' }, { status: 400 })
    }

    // Update status
    await prisma.meeting.update({ where: { id: meetingId }, data: { status: 'ANALYZING' } })

    // Call Gemini
    const extracted = await extractDecisionsAndActions(transcriptText)

    // Save to DB in a transaction
    await prisma.$transaction(async (tx) => {
      // Clear existing results
      await tx.decision.deleteMany({ where: { meetingId } })
      await tx.actionItem.deleteMany({ where: { meetingId } })

      // Insert decisions
      if (extracted.decisions?.length) {
        await tx.decision.createMany({
          data: extracted.decisions.map((d) => ({
            meetingId,
            decisionText: d.decision,
          })),
        })
      }

      // Insert action items
      if (extracted.action_items?.length) {
        await tx.actionItem.createMany({
          data: extracted.action_items.map((a) => ({
            meetingId,
            task: a.task,
            responsiblePerson: a.responsible_person,
            deadline: a.deadline,
            status: 'PENDING',
          })),
        })
      }

      await tx.meeting.update({ where: { id: meetingId }, data: { status: 'ANALYZED' } })
    })

    return NextResponse.json({
      success: true,
      data: {
        decisions: extracted.decisions ?? [],
        action_items: extracted.action_items ?? [],
      },
    })

  } catch (err: any) {
    console.error('[POST /api/analyze]', err)

    // Mark meeting as error
    try {
      const { meetingId } = await new Request(req).json().catch(() => ({})) as any
      if (meetingId) await prisma.meeting.update({ where: { id: meetingId }, data: { status: 'ERROR' } })
    } catch { /* ignore */ }

    return NextResponse.json(
      { success: false, error: err.message ?? 'Analysis failed' },
      { status: 500 }
    )
  }
}
