import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { analyzeSentiment } from "@/lib/gemini";
import {
  buildTranscriptText,
  mapSentimentSegmentsToRecords,
} from "@/lib/project-insights";

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
    if (!meetingId) {
      return NextResponse.json(
        { success: false, error: "meetingId is required" },
        { status: 400 },
      );
    }

    const user = await prisma.user.findUnique({ where: { clerkUserId } });
    if (!user) {
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 },
      );
    }

    const sentiments = await prisma.sentiment.findMany({
      where: { meetingId, meeting: { project: { ownerId: user.id } } },
      orderBy: { createdAt: "asc" },
      include: {
        segment: {
          select: { text: true, startTime: true, speaker: true },
        },
      },
    });

    return NextResponse.json({ success: true, data: sentiments });
  } catch (err: any) {
    console.error("[GET /api/sentiment]", err);
    return NextResponse.json(
      { success: false, error: "Failed to fetch sentiment data" },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  let meetingId: string | undefined;

  try {
    const { userId: clerkUserId } = auth();
    if (!clerkUserId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const body = await req.json();
    meetingId = body?.meetingId;
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
      await tx.sentiment.deleteMany({ where: { meetingId: meeting.id } });

      if (records.length > 0) {
        await tx.sentiment.createMany({
          data: records.map((record) => ({
            segmentId: record.segmentId,
            meetingId: meeting.id,
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
