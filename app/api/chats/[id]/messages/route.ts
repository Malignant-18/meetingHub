// app/api/chats/[id]/messages/route.ts
// POST — send a user message, get Gemini response, save both, return assistant message

import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { queryChatbot } from "@/lib/gemini";

const MESSAGE_LIMIT = 50; // max messages per chat (user + assistant combined)
const SEGMENT_CAP = 600; // max transcript segments to send to Gemini

export async function POST(
  req: Request,
  { params }: { params: { id: string } },
) {
  let body: { content?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid JSON body" },
      { status: 400 },
    );
  }

  const content = body?.content?.trim();
  if (!content) {
    return NextResponse.json(
      { success: false, error: "Message content is required" },
      { status: 400 },
    );
  }

  try {
    const { userId: clerkUserId } = auth();
    if (!clerkUserId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const user = await prisma.user.findUnique({ where: { clerkUserId } });
    if (!user)
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 },
      );

    // Fetch chat with messages + context meetings
    const chat = await prisma.chat.findFirst({
      where: { id: params.id, project: { ownerId: user.id } },
      include: {
        messages: { orderBy: { createdAt: "asc" } },
        contexts: {
          include: {
            meeting: {
              select: { id: true, fileName: true },
            },
          },
        },
      },
    });

    if (!chat) {
      return NextResponse.json(
        { success: false, error: "Chat not found" },
        { status: 404 },
      );
    }

    // Enforce message limit
    if (chat.messages.length >= MESSAGE_LIMIT) {
      return NextResponse.json(
        {
          success: false,
          error: `This chat has reached the ${MESSAGE_LIMIT} message limit. Start a new chat to continue.`,
        },
        { status: 429 },
      );
    }

    // Check there are context meetings to search
    if (chat.contexts.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error:
            "This chat has no transcript context. Delete and recreate the chat.",
        },
        { status: 400 },
      );
    }

    // Fetch transcript segments for all context meetings
    const meetingIds = chat.contexts.map((c) => c.meetingId);
    const segments = await prisma.transcriptSegment.findMany({
      where: { meetingId: { in: meetingIds } },
      include: { meeting: { select: { fileName: true } } },
      orderBy: [{ meetingId: "asc" }, { sequence: "asc" }],
      take: SEGMENT_CAP,
    });

    // Build context string grouped by file
    const grouped: Record<string, typeof segments> = {};
    for (const seg of segments) {
      const key = seg.meeting.fileName;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(seg);
    }

    const transcriptContext = Object.entries(grouped)
      .map(
        ([filename, segs]) =>
          `=== SOURCE: ${filename} ===\n` +
          segs.map((s) => `${s.speaker}: ${s.text}`).join("\n"),
      )
      .join("\n\n");

    // Build Gemini conversation history from existing messages
    const history = chat.messages.map((m) => ({
      role: (m.role === "assistant" ? "model" : "user") as "user" | "model",
      parts: m.content,
    }));

    // Call Gemini
    const answer = await queryChatbot(content, transcriptContext, history);

    // Save user message + assistant message, optionally auto-title the chat
    const isFirstMessage = chat.messages.length === 0;

    await prisma.$transaction(async (tx) => {
      await tx.chatMessage.create({
        data: { chatId: chat.id, role: "user", content },
      });
      await tx.chatMessage.create({
        data: { chatId: chat.id, role: "assistant", content: answer },
      });

      // Auto-title chat from first user message (first 7 words)
      if (isFirstMessage) {
        const autoTitle = content
          .split(/\s+/)
          .slice(0, 7)
          .join(" ")
          .replace(/[?!.,;:]$/, "")
          .trim();
        await tx.chat.update({
          where: { id: chat.id },
          data: {
            title:
              autoTitle.length > 60 ? autoTitle.slice(0, 60) + "…" : autoTitle,
            updatedAt: new Date(),
          },
        });
      } else {
        await tx.chat.update({
          where: { id: chat.id },
          data: { updatedAt: new Date() },
        });
      }
    });

    return NextResponse.json({
      success: true,
      data: {
        role: "assistant",
        content: answer,
      },
    });
  } catch (err: any) {
    console.error("[POST /api/chats/[id]/messages]", err);
    return NextResponse.json(
      { success: false, error: err.message ?? "Failed to send message" },
      { status: 500 },
    );
  }
}
