import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

export async function POST(
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
    if (!user) {
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 },
      );
    }

    const meeting = await prisma.meeting.findFirst({
      where: {
        id: params.id,
        project: { ownerId: user.id },
      },
      select: { id: true },
    });

    if (!meeting) {
      return NextResponse.json(
        { success: false, error: "Meeting not found" },
        { status: 404 },
      );
    }

    await prisma.$transaction(async (tx) => {
      await tx.sentiment.deleteMany({ where: { meetingId: meeting.id } });
      await tx.actionItem.deleteMany({ where: { meetingId: meeting.id } });
      await tx.decision.deleteMany({ where: { meetingId: meeting.id } });
      await tx.meeting.update({
        where: { id: meeting.id },
        data: { status: "PARSED" },
      });
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("[POST /api/meetings/[id]/reset-ai]", err);
    return NextResponse.json(
      { success: false, error: err.message ?? "Failed to reset AI data" },
      { status: 500 },
    );
  }
}
