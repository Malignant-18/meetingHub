// app/api/chats/[id]/messages/route.ts
// POST — send a user message, get Gemini response with source references, save both

import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { queryChatbot } from "@/lib/gemini";

const MESSAGE_LIMIT = 50;
const SEGMENT_CAP = 600;

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

  const content = body.content?.trim();
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
    if (!user) {
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 },
      );
    }

    const chat = await prisma.chat.findFirst({
      where: {
        id: params.id,
        project: { ownerId: user.id },
      },
      include: {
        messages: { orderBy: { createdAt: "asc" } },
        contexts: {
          include: {
            meeting: { select: { id: true, title: true, fileName: true } },
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

    if (chat.messages.length >= MESSAGE_LIMIT) {
      return NextResponse.json(
        { success: false, error: `Chat limit reached (${MESSAGE_LIMIT} messages)` },
        { status: 429 },
      );
    }

    if (chat.contexts.length === 0) {
      return NextResponse.json(
        { success: false, error: "No transcript context." },
        { status: 400 },
      );
    }

    const meetingIds = chat.contexts.map((context) => context.meetingId);
    const segments = await prisma.transcriptSegment.findMany({
      where: { meetingId: { in: meetingIds } },
      include: {
        meeting: { select: { fileName: true, title: true } },
      },
      orderBy: [{ meetingId: "asc" }, { sequence: "asc" }],
      take: SEGMENT_CAP,
    });

    const groupedByMeeting: Record<string, typeof segments> = {};
    for (const segment of segments) {
      const key = segment.meeting.fileName || segment.meeting.title;
      if (!groupedByMeeting[key]) groupedByMeeting[key] = [];
      groupedByMeeting[key].push(segment);
    }

    const transcriptContext = Object.entries(groupedByMeeting)
      .map(([filename, meetingSegments]) => {
        const lines = meetingSegments
          .map((segment) => {
            const time = segment.startTime ? ` [${segment.startTime}]` : "";
            return `[seg_${segment.id}] ${segment.speaker}${time}: ${segment.text}`;
          })
          .join("\n");

        return `=== SOURCE: ${filename} ===\n${lines}`;
      })
      .join("\n\n");

    const history = chat.messages.map((message) => ({
      role: (message.role === "assistant" ? "model" : "user") as
        | "user"
        | "model",
      parts: message.content,
    }));

    const { answer, references } = await queryChatbot(
      content,
      transcriptContext,
      history,
    );

    const validSegmentIds = new Set(segments.map((segment) => `seg_${segment.id}`));
    const validRefs = references.filter((reference) =>
      validSegmentIds.has(reference),
    );
    const dbSegmentIds = validRefs.map((reference) =>
      reference.replace(/^seg_/, ""),
    );
    const uniqueDbSegmentIds = Array.from(new Set(dbSegmentIds));

    const isFirstMessage = chat.messages.length === 0;

    await prisma.$transaction(async (tx) => {
      await tx.chatMessage.create({
        data: {
          chatId: chat.id,
          role: "user",
          content,
        },
      });

      await tx.chatMessage.create({
        data: {
          chatId: chat.id,
          role: "assistant",
          content: answer,
          references:
            uniqueDbSegmentIds.length > 0
              ? JSON.stringify(uniqueDbSegmentIds)
              : null,
        },
      });

      const nextTitle = content
        .split(/\s+/)
        .slice(0, 7)
        .join(" ")
        .replace(/[?!.,;:]$/, "")
        .trim();

      await tx.chat.update({
        where: { id: chat.id },
        data: {
          updatedAt: new Date(),
          ...(isFirstMessage && nextTitle
            ? {
                title:
                  nextTitle.length > 60
                    ? `${nextTitle.slice(0, 60)}…`
                    : nextTitle,
              }
            : {}),
        },
      });
    });

    const referencedSegments =
      uniqueDbSegmentIds.length > 0
        ? await prisma.transcriptSegment.findMany({
            where: { id: { in: uniqueDbSegmentIds } },
            include: {
              meeting: { select: { title: true, fileName: true } },
            },
          })
        : [];

    const referencedSegmentMap = new Map(
      referencedSegments.map((segment) => [segment.id, segment]),
    );

    return NextResponse.json({
      success: true,
      data: {
        role: "assistant",
        content: answer,
        references: uniqueDbSegmentIds
          .map((segmentId) => referencedSegmentMap.get(segmentId))
          .filter(Boolean)
          .map((segment) => ({
            segmentId: segment!.id,
            speaker: segment!.speaker,
            text: segment!.text,
            startTime: segment!.startTime,
            meetingTitle: segment!.meeting.title,
            meetingFileName: segment!.meeting.fileName,
          })),
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
