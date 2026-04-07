// app/projects/[id]/meetings/[meetingId]/page.tsx

import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Navbar from "@/components/Navbar";
import AnalyzeButton from "@/components/AnalyzeButton";
import SentimentButton from "@/components/SentimentButton";
import MeetingDetailClient from "@/components/MeetingDetailClient";
import type { TranscriptSegmentData } from "@/components/TranscriptPanel";

async function getMeeting(
  projectId: string,
  meetingId: string,
  clerkUserId: string,
) {
  const user = await prisma.user.findUnique({ where: { clerkUserId } });
  if (!user) return null;

  return prisma.meeting.findFirst({
    where: { id: meetingId, project: { id: projectId, ownerId: user.id } },
    include: {
      project: { select: { id: true, name: true } },
      segments: { orderBy: { sequence: "asc" } },
      decisions: {
        orderBy: { createdAt: "asc" },
        include: { contextSegment: { select: { id: true } } },
      },
      actionItems: { orderBy: { createdAt: "asc" } },
      sentiments: {
        orderBy: { createdAt: "asc" },
        include: { segment: { select: { text: true, startTime: true } } },
      },
    },
  });
}

export default async function MeetingPage({
  params,
}: {
  params: { id: string; meetingId: string };
}) {
  const { userId } = auth();
  if (!userId) return null;

  const meeting = await getMeeting(params.id, params.meetingId, userId);
  if (!meeting) notFound();

  const isAnalyzed = meeting.status === "ANALYZED";
  const canAnalyze = ["PARSED", "ANALYZED", "ERROR"].includes(meeting.status);
  const hasSentiment = meeting.sentiments.length > 0;

  // Shape segments for TranscriptPanel
  const transcriptSegments: TranscriptSegmentData[] = meeting.segments.map(
    (s) => ({
      id: s.id,
      speaker: s.speaker,
      text: s.text,
      startTime: s.startTime,
      meetingFileName: meeting.fileName,
      meetingTitle: meeting.title,
    }),
  );

  // Compute per-speaker segment counts for the bar chart
  const speakerCounts: Record<string, number> = {};
  for (const seg of meeting.segments) {
    speakerCounts[seg.speaker] = (speakerCounts[seg.speaker] ?? 0) + 1;
  }
  const speakerStats = Object.entries(speakerCounts)
    .map(([speaker, segments]) => ({ speaker, segments }))
    .sort((a, b) => b.segments - a.segments);

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#081004] text-[#d5f5dc]">
      {/* Navbar + action buttons */}
      <div className="relative sticky top-0 z-20">
        <Navbar />
        {/* Floating action bar below navbar */}
      </div>

      {/* Client component owns all interactive state */}
      <MeetingDetailClient
        meeting={{
          id: meeting.id,
          title: meeting.title,
          fileName: meeting.fileName,
          status: meeting.status,
          speakerCount: meeting.speakerCount,
          wordCount: meeting.wordCount,
          createdAt: meeting.createdAt,
          project: meeting.project,
        }}
        decisions={meeting.decisions.map((d) => ({
          id: d.id,
          decisionText: d.decisionText,
          contextSegmentId: d.contextSegment?.id ?? null,
        }))}
        actionItems={meeting.actionItems.map((a) => ({
          id: a.id,
          task: a.task,
          responsiblePerson: a.responsiblePerson,
          deadline: a.deadline,
          status: a.status as "PENDING" | "IN_PROGRESS" | "DONE",
        }))}
        sentiments={meeting.sentiments.map((s) => ({
          id: s.id,
          speaker: s.speaker,
          sentimentScore: s.sentimentScore,
          sentimentLabel: s.sentimentLabel,
          segment: s.segment
            ? { text: s.segment.text, startTime: s.segment.startTime }
            : null,
        }))}
        transcriptSegments={transcriptSegments}
        speakerStats={speakerStats}
      />
    </div>
  );
}
