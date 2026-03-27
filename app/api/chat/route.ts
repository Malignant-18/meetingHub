// app/api/chat/route.ts
// Chatbot endpoint — retrieves all transcript segments for the project,
// sends them as context to Gemini, returns answer with citations

import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { queryChatbot } from '@/lib/gemini'

export async function POST(req: Request) {
  try {
    const { userId: clerkUserId } = auth()
    if (!clerkUserId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { projectId, meetingId, question, history } = await req.json()

    if (!question?.trim()) {
      return NextResponse.json({ success: false, error: 'Question is required' }, { status: 400 })
    }

    const user = await prisma.user.findUnique({ where: { clerkUserId } })
    if (!user) return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 })

    // Fetch relevant segments — either for a specific meeting or whole project
    const segments = await prisma.transcriptSegment.findMany({
      where: meetingId
        ? { meetingId }
        : { meeting: { project: { id: projectId, ownerId: user.id } } },
      include: { meeting: { select: { title: true, fileName: true } } },
      orderBy: [{ meeting: { createdAt: 'asc' } }, { sequence: 'asc' }],
      take: 500, // cap to avoid context overflow
    })

    if (segments.length === 0) {
      return NextResponse.json({
        success: true,
        data: { answer: "I don't have any transcript content to search through yet. Please upload and parse a meeting transcript first." },
      })
    }

    // Build context string grouped by meeting
    const grouped: Record<string, typeof segments> = {}
    for (const seg of segments) {
      const key = seg.meeting.fileName
      if (!grouped[key]) grouped[key] = []
      grouped[key].push(seg)
    }

    const transcriptContext = Object.entries(grouped)
      .map(([filename, segs]) =>
        `=== ${filename} ===\n` + segs.map((s) => `${s.speaker}: ${s.text}`).join('\n')
      )
      .join('\n\n')

    // Build conversation history for multi-turn
    const conversationHistory = (history ?? []).map((m: any) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: m.content,
    }))

    const answer = await queryChatbot(question, transcriptContext, conversationHistory)

    return NextResponse.json({ success: true, data: { answer } })

  } catch (err: any) {
    console.error('[POST /api/chat]', err)
    return NextResponse.json(
      { success: false, error: err.message ?? 'Chat failed' },
      { status: 500 }
    )
  }
}
