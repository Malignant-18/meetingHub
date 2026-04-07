// app/api/chats/route.ts
// GET  — list chats filtered by meetingId, projectId, and/or scope
// POST — create a new chat (meeting-scoped or project-scoped)

import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const CHAT_LIMIT_PER_PROJECT = 5;

// ─── GET ────────────────────────────────────────────────────────────────────
export async function GET(req: Request) {
  try {
    const { userId: clerkUserId } = auth();
    if (!clerkUserId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const { searchParams } = new URL(req.url);
    const meetingId = searchParams.get("meetingId");
    const projectId = searchParams.get("projectId");

    const scope = searchParams.get("scope");

    const user = await prisma.user.findUnique({ where: { clerkUserId } });
    if (!user)
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 },
      );

    const where = meetingId
      ? {
          contexts: { some: { meetingId } },
          project: { ownerId: user.id },
          ...(scope === "MEETING" || scope === "PROJECT" ? { scope } : {}),
        }
      : projectId
        ? {
            projectId,
            project: { ownerId: user.id },
            ...(scope === "MEETING" || scope === "PROJECT" ? { scope } : {}),
          }
        : {
            project: { ownerId: user.id },
            ...(scope === "MEETING" || scope === "PROJECT" ? { scope } : {}),
          };

    const chats = await prisma.chat.findMany({
      where,
      include: {
        _count: { select: { messages: true } },
        contexts: {
          include: {
            meeting: {
              select: {
                id: true,
                title: true,
                fileName: true,
                createdAt: true,
              },
            },
          },
        },
        project: { select: { id: true, name: true } },
      },
      orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json({ success: true, data: chats });
  } catch (err: any) {
    console.error("[GET /api/chats]", err);
    return NextResponse.json(
      { success: false, error: "Failed to fetch chats" },
      { status: 500 },
    );
  }
}

// ─── POST ───────────────────────────────────────────────────────────────────
export async function POST(req: Request) {
  try {
    const { userId: clerkUserId } = auth();
    if (!clerkUserId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const body = await req.json();
    const { projectId, meetingId, scope = "MEETING" } = body;

    if (!projectId) {
      return NextResponse.json(
        { success: false, error: "projectId is required" },
        { status: 400 },
      );
    }

    const user = await prisma.user.findUnique({ where: { clerkUserId } });
    if (!user)
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 },
      );

    // Verify project ownership
    const project = await prisma.project.findFirst({
      where: { id: projectId, ownerId: user.id },
      include: { _count: { select: { chats: true } } },
    });
    if (!project) {
      return NextResponse.json(
        { success: false, error: "Project not found" },
        { status: 404 },
      );
    }

    // Enforce chat limit per project
    if (project._count.chats >= CHAT_LIMIT_PER_PROJECT) {
      return NextResponse.json(
        {
          success: false,
          error: `Chat limit reached. You can have at most ${CHAT_LIMIT_PER_PROJECT} chats per project. Delete an existing chat to create a new one.`,
        },
        { status: 429 },
      );
    }

    // For meeting-scoped chat, verify meeting exists in this project
    if (scope === "MEETING" && meetingId) {
      const meeting = await prisma.meeting.findFirst({
        where: { id: meetingId, projectId },
      });
      if (!meeting) {
        return NextResponse.json(
          { success: false, error: "Meeting not found" },
          { status: 404 },
        );
      }
    }

    // Create chat + context in a transaction
    const chat = await prisma.$transaction(async (tx) => {
      const newChat = await tx.chat.create({
        data: {
          projectId,
          title: "New chat",
          scope: scope === "PROJECT" ? "PROJECT" : "MEETING",
        },
      });

      // For meeting scope, add that meeting as context
      // For project scope, add ALL meetings in the project
      if (scope === "PROJECT") {
        const meetings = await tx.meeting.findMany({
          where: { projectId },
          select: { id: true },
        });
        if (meetings.length > 0) {
          await tx.chatContext.createMany({
            data: meetings.map((m) => ({
              chatId: newChat.id,
              meetingId: m.id,
            })),
          });
        }
      } else if (meetingId) {
        await tx.chatContext.create({
          data: { chatId: newChat.id, meetingId },
        });
      }

      return newChat;
    });

    // Return chat with contexts
    const fullChat = await prisma.chat.findUnique({
      where: { id: chat.id },
      include: {
        _count: { select: { messages: true } },
        contexts: {
          include: {
            meeting: {
              select: {
                id: true,
                title: true,
                fileName: true,
                createdAt: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json(
      { success: true, data: fullChat },
      { status: 201 },
    );
  } catch (err: any) {
    console.error("[POST /api/chats]", err);
    return NextResponse.json(
      { success: false, error: "Failed to create chat" },
      { status: 500 },
    );
  }
}
