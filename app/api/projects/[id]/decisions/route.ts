import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { extractDecisionsAndActions } from "@/lib/gemini";
import { prisma } from "@/lib/prisma";
import { getOrSyncUser } from "@/lib/auth-user";
import {
  buildTranscriptText,
  summarizeProjectDecisions,
} from "@/lib/project-insights";

export async function POST(
  _req: Request,
  { params }: { params: { id: string } },
) {
  let activeMeetingId: string | null = null;

  try {
    const { userId: clerkUserId } = auth();
    if (!clerkUserId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const user = await getOrSyncUser(clerkUserId);

    const project = await prisma.project.findFirst({
      where: { id: params.id, ownerId: user.id },
      include: {
        meetings: {
          include: {
            segments: { orderBy: { sequence: "asc" } },
            decisions: true,
            actionItems: true,
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!project) {
      return NextResponse.json(
        { success: false, error: "Project not found" },
        { status: 404 },
      );
    }

    const meetingsWithContent = project.meetings.filter(
      (meeting) => meeting.segments.length > 0,
    );

    if (meetingsWithContent.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "This project does not have any transcript content yet",
        },
        { status: 400 },
      );
    }

    for (const meeting of meetingsWithContent) {
      activeMeetingId = meeting.id;
      const transcriptText = buildTranscriptText(meeting.segments);
      await prisma.meeting.update({
        where: { id: meeting.id },
        data: { status: "ANALYZING" },
      });

      const extracted = await extractDecisionsAndActions(transcriptText);

      await prisma.$transaction(async (tx) => {
        await tx.decision.deleteMany({ where: { meetingId: meeting.id } });
        await tx.actionItem.deleteMany({ where: { meetingId: meeting.id } });

        if (extracted.decisions.length > 0) {
          await tx.decision.createMany({
            data: extracted.decisions.map((decision) => ({
              meetingId: meeting.id,
              decisionText: decision.decision,
            })),
          });
        }

        if (extracted.action_items.length > 0) {
          await tx.actionItem.createMany({
            data: extracted.action_items.map((item) => ({
              meetingId: meeting.id,
              task: item.task,
              responsiblePerson: item.responsible_person,
              deadline: item.deadline,
              status: "PENDING",
            })),
          });
        }

        await tx.meeting.update({
          where: { id: meeting.id },
          data: { status: "ANALYZED" },
        });
      });
    }

    activeMeetingId = null;

    const refreshedProject = await prisma.project.findFirst({
      where: { id: params.id, ownerId: user.id },
      include: {
        meetings: {
          include: {
            decisions: {
              orderBy: { createdAt: "desc" },
            },
            actionItems: {
              orderBy: { createdAt: "desc" },
            },
            sentiments: true,
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!refreshedProject) {
      return NextResponse.json(
        { success: false, error: "Project not found after analysis" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      data: summarizeProjectDecisions(refreshedProject.meetings),
    });
  } catch (err: any) {
    if (activeMeetingId) {
      await prisma.meeting
        .update({
          where: { id: activeMeetingId },
          data: { status: "ERROR" },
        })
        .catch(() => undefined);
    }

    console.error(`[POST /api/projects/${params.id}/decisions]`, err);
    return NextResponse.json(
      { success: false, error: err.message ?? "Decision extraction failed" },
      { status: 500 },
    );
  }
}
