import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { analyzeSentiment } from "@/lib/gemini";
import {
  buildTranscriptText,
  mapSentimentSegmentsToRecords,
} from "@/lib/project-insights";

export async function POST(req: Request) {
  try {
    const { userId: clerkUserId } = auth();
    if (!clerkUserId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const { meetingId } = await req.json();
    if (!meetingId) {
      return NextResponse.json(
        { success: false, error: "meetingId is required" },
        { status: 400 },
      );
    }

    const user = await prisma.user.findUnique({ where: { clerkUserId } });
    if (!user)
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 },
      );

    const meeting = await prisma.meeting.findFirst({
      where: { id: meetingId, project: { ownerId: user.id } },
      include: { segments: { orderBy: { sequence: "asc" } } },
    });

    if (!meeting) {
      return NextResponse.json(
        { success: false, error: "Meeting not found" },
        { status: 404 },
      );
    }

    const transcriptText = buildTranscriptText(meeting.segments);

    const sentimentData = await analyzeSentiment(transcriptText);
    const records = mapSentimentSegmentsToRecords(
      meeting.segments,
      sentimentData,
    );

    await prisma.$transaction(async (tx) => {
      await tx.sentiment.deleteMany({ where: { meetingId } });

      if (records.length > 0) {
        await tx.sentiment.createMany({
          data: records.map((record) => ({
            segmentId: record.segmentId,
            meetingId,
            speaker: record.speaker,
            sentimentScore: record.sentimentScore,
            sentimentLabel: record.sentimentLabel,
          })),
        });
      }
    });

    return NextResponse.json({ success: true, data: sentimentData });
  } catch (err: any) {
    console.error("[POST /api/sentiment]", err);
    return NextResponse.json(
      { success: false, error: err.message ?? "Sentiment analysis failed" },
      { status: 500 },
    );
  }
}
