// app/api/chats/[id]/route.ts
// GET    — fetch a single chat with its full message history
// DELETE — delete a chat and all its messages

import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// ─── GET ────────────────────────────────────────────────────────────────────
export async function GET(
  _req: Request,
  { params }: { params: { id: string } },
) {
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

    return NextResponse.json({ success: true, data: chat });
  } catch (err: any) {
    console.error("[GET /api/chats/[id]]", err);
    return NextResponse.json(
      { success: false, error: "Failed to fetch chat" },
      { status: 500 },
    );
  }
}

// ─── PATCH (rename) ──────────────────────────────────────────────────────────
export async function PATCH(
  req: Request,
  { params }: { params: { id: string } },
) {
  try {
    const { userId: clerkUserId } = auth();
    if (!clerkUserId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const { title } = await req.json();
    if (!title?.trim()) {
      return NextResponse.json(
        { success: false, error: "Title is required" },
        { status: 400 },
      );
    }

    const user = await prisma.user.findUnique({ where: { clerkUserId } });
    if (!user)
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 },
      );

    const chat = await prisma.chat.findFirst({
      where: { id: params.id, project: { ownerId: user.id } },
    });
    if (!chat) {
      return NextResponse.json(
        { success: false, error: "Chat not found" },
        { status: 404 },
      );
    }

    const updated = await prisma.chat.update({
      where: { id: params.id },
      data: { title: title.trim().slice(0, 80) },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (err: any) {
    console.error("[PATCH /api/chats/[id]]", err);
    return NextResponse.json(
      { success: false, error: "Failed to rename chat" },
      { status: 500 },
    );
  }
}

// ─── DELETE ──────────────────────────────────────────────────────────────────
export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } },
) {
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

    const chat = await prisma.chat.findFirst({
      where: { id: params.id, project: { ownerId: user.id } },
    });
    if (!chat) {
      return NextResponse.json(
        { success: false, error: "Chat not found" },
        { status: 404 },
      );
    }

    // Cascade deletes messages + contexts via DB relations
    await prisma.chat.delete({ where: { id: params.id } });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("[DELETE /api/chats/[id]]", err);
    return NextResponse.json(
      { success: false, error: "Failed to delete chat" },
      { status: 500 },
    );
  }
}
