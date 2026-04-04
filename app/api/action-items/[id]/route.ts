// app/api/action-items/[id]/route.ts
// PATCH — cycle the status of an action item (Pending → In Progress → Done)
// Called from ActionTable.tsx when user clicks the status badge

import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const VALID_STATUSES = ["PENDING", "IN_PROGRESS", "DONE"] as const;
type ActionStatus = (typeof VALID_STATUSES)[number];

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

    const body = await req.json();
    const status = body?.status as ActionStatus;

    if (!VALID_STATUSES.includes(status)) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}`,
        },
        { status: 400 },
      );
    }

    // Verify the action item belongs to this user
    const user = await prisma.user.findUnique({ where: { clerkUserId } });
    if (!user) {
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 },
      );
    }

    const actionItem = await prisma.actionItem.findFirst({
      where: {
        id: params.id,
        meeting: {
          project: { ownerId: user.id },
        },
      },
    });

    if (!actionItem) {
      return NextResponse.json(
        { success: false, error: "Action item not found" },
        { status: 404 },
      );
    }

    const updated = await prisma.actionItem.update({
      where: { id: params.id },
      data: { status, updatedAt: new Date() },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (err: any) {
    console.error("[PATCH /api/action-items/[id]]", err);
    return NextResponse.json(
      { success: false, error: err.message ?? "Update failed" },
      { status: 500 },
    );
  }
}
