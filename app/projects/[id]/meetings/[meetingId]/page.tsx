// app/projects/[id]/meetings/[meetingId]/page.tsx
// Day 2 — full meeting detail page
// Features: transcript viewer, analyze button, decisions/action-items table, sentiment dashboard

import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Navbar from "@/components/Navbar";
import Link from "next/link";
import {
  ArrowLeft,
  FileText,
  Users,
  AlignLeft,
  Calendar,
  CheckSquare,
  Lightbulb,
  BookOpen,
  BarChart2,
  MessageSquare,
} from "lucide-react";
import { formatDate } from "@/lib/utils";
import AnalyzeButton from "@/components/AnalyzeButton";
import SentimentButton from "@/components/SentimentButton";
import ActionTable from "@/components/ActionTable";
import TranscriptViewer from "@/components/TranscriptViewer";
import SentimentDashboard from "@/components/SentimentDashboard";
import ChatPanel from "@/components/ChatPanel";

// ─── Data fetching ──────────────────────────────────────────────────────────
async function getMeeting(
  projectId: string,
  meetingId: string,
  clerkUserId: string,
) {
  const user = await prisma.user.findUnique({ where: { clerkUserId } });
  if (!user) return null;

  return prisma.meeting.findFirst({
    where: {
      id: meetingId,
      project: { id: projectId, ownerId: user.id },
    },
    include: {
      project: { select: { id: true, name: true } },
      segments: { orderBy: { sequence: "asc" } },
      actionItems: { orderBy: { createdAt: "asc" } },
      decisions: { orderBy: { createdAt: "asc" } },
      sentiments: {
        orderBy: { createdAt: "asc" },
        include: {
          segment: { select: { text: true, startTime: true } },
        },
      },
    },
  });
}

// ─── Status badge config ────────────────────────────────────────────────────
const statusConfig: Record<string, { label: string; className: string }> = {
  UPLOADED: { label: "Uploaded", className: "bg-slate-700 text-slate-300" },
  PARSING: {
    label: "Parsing…",
    className: "bg-blue-900 text-blue-300 animate-pulse",
  },
  PARSED: { label: "Parsed", className: "bg-indigo-900 text-indigo-300" },
  ANALYZING: {
    label: "Analyzing…",
    className: "bg-amber-900 text-amber-300 animate-pulse",
  },
  ANALYZED: { label: "Analyzed", className: "bg-emerald-900 text-emerald-300" },
  ERROR: { label: "Error", className: "bg-red-900 text-red-300" },
};

// ─── Page ───────────────────────────────────────────────────────────────────
export default async function MeetingPage({
  params,
}: {
  params: { id: string; meetingId: string };
}) {
  const { userId } = auth();
  if (!userId) return null;

  const meeting = await getMeeting(params.id, params.meetingId, userId);
  if (!meeting) notFound();

  const status = statusConfig[meeting.status] ?? statusConfig.UPLOADED;
  const isAnalyzed = meeting.status === "ANALYZED";
  const canAnalyze = ["PARSED", "ANALYZED", "ERROR"].includes(meeting.status);
  const hasSentiment = meeting.sentiments.length > 0;

  return (
    <div className="min-h-screen bg-[#0f0e1a]">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        {/* ── Breadcrumb ── */}
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Link
            href="/dashboard"
            className="hover:text-slate-300 transition-colors"
          >
            Dashboard
          </Link>
          <span>/</span>
          <Link
            href={`/projects/${meeting.project.id}`}
            className="hover:text-slate-300 transition-colors truncate max-w-32"
          >
            {meeting.project.name}
          </Link>
          <span>/</span>
          <span className="text-slate-300 truncate max-w-48">
            {meeting.title}
          </span>
        </div>

        {/* ── Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-2 flex-wrap">
              <Link
                href={`/projects/${meeting.project.id}`}
                className="text-slate-500 hover:text-white transition-colors"
              >
                <ArrowLeft size={16} />
              </Link>
              <h1 className="text-2xl font-bold text-white truncate">
                {meeting.title}
              </h1>
              <span
                className={`text-xs px-2.5 py-1 rounded-full font-medium flex-shrink-0 ${status.className}`}
              >
                {status.label}
              </span>
            </div>
            <div className="flex items-center gap-5 text-sm text-slate-400 flex-wrap ml-6">
              <span className="flex items-center gap-1.5">
                <Calendar size={13} /> {formatDate(meeting.createdAt)}
              </span>
              <span className="flex items-center gap-1.5">
                <Users size={13} /> {meeting.speakerCount} speaker
                {meeting.speakerCount !== 1 ? "s" : ""}
              </span>
              <span className="flex items-center gap-1.5">
                <AlignLeft size={13} /> {meeting.wordCount.toLocaleString()}{" "}
                words
              </span>
              <span className="flex items-center gap-1.5">
                <FileText size={13} /> {meeting.segments.length} segments
              </span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-3 flex-wrap">
            {canAnalyze && (
              <AnalyzeButton meetingId={meeting.id} isAnalyzed={isAnalyzed} />
            )}
            {isAnalyzed && (
              <SentimentButton
                meetingId={meeting.id}
                hasResults={hasSentiment}
              />
            )}
          </div>
        </div>

        {/* ── Stats row — shown after analysis ── */}
        {isAnalyzed && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              {
                label: "Decisions",
                value: meeting.decisions.length,
                icon: Lightbulb,
                color: "text-amber-400",
                bg: "bg-amber-400/10",
              },
              {
                label: "Action items",
                value: meeting.actionItems.length,
                icon: CheckSquare,
                color: "text-emerald-400",
                bg: "bg-emerald-400/10",
              },
              {
                label: "Pending",
                value: meeting.actionItems.filter((a) => a.status === "PENDING")
                  .length,
                icon: CheckSquare,
                color: "text-indigo-400",
                bg: "bg-indigo-400/10",
              },
              {
                label: "Speakers",
                value: meeting.speakerCount,
                icon: Users,
                color: "text-purple-400",
                bg: "bg-purple-400/10",
              },
            ].map((stat) => (
              <div
                key={stat.label}
                className="bg-[#1e1c32] border border-slate-700/50 rounded-xl p-4"
              >
                <div
                  className={`w-8 h-8 rounded-lg ${stat.bg} flex items-center justify-center mb-2`}
                >
                  <stat.icon size={15} className={stat.color} />
                </div>
                <div className="text-2xl font-bold text-white">
                  {stat.value}
                </div>
                <div className="text-xs text-slate-500 mt-0.5">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Main content: analysis left, transcript right ── */}
        <div className="grid lg:grid-cols-5 gap-6">
          {/* Left — analysis (3/5) */}
          <div className="lg:col-span-3 space-y-6">
            {/* Not yet analyzed */}
            {!isAnalyzed && meeting.status !== "ANALYZING" && (
              <div className="bg-[#1e1c32] border border-slate-700/50 rounded-2xl p-8 text-center">
                <div className="w-14 h-14 rounded-2xl bg-indigo-600/10 border border-indigo-600/20 flex items-center justify-center mx-auto mb-4">
                  <Lightbulb size={24} className="text-indigo-400" />
                </div>
                <h2 className="text-white font-semibold mb-2">
                  Ready to analyze
                </h2>
                <p className="text-slate-400 text-sm max-w-xs mx-auto leading-relaxed">
                  Click{" "}
                  <span className="text-indigo-400 font-medium">
                    Run AI Analysis
                  </span>{" "}
                  to extract decisions and action items using Gemini.
                </p>
              </div>
            )}

            {/* Analyzing spinner */}
            {meeting.status === "ANALYZING" && (
              <div className="bg-[#1e1c32] border border-amber-700/30 rounded-2xl p-8 text-center">
                <div className="w-10 h-10 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <p className="text-amber-300 font-medium">
                  Gemini is analyzing your transcript…
                </p>
                <p className="text-slate-500 text-sm mt-1">
                  Usually 10–30 seconds. Refresh when done.
                </p>
              </div>
            )}

            {/* Error */}
            {meeting.status === "ERROR" && (
              <div className="bg-red-950/30 border border-red-700/40 rounded-2xl p-6 text-center">
                <p className="text-red-400 font-medium mb-1">Analysis failed</p>
                <p className="text-slate-500 text-sm">
                  Check your Gemini API key in .env.local and try again.
                </p>
              </div>
            )}

            {/* ── Decisions + Action items table ── */}
            {isAnalyzed && (
              <ActionTable
                meetingId={meeting.id}
                meetingTitle={meeting.title}
                decisions={meeting.decisions.map((d) => ({
                  id: d.id,
                  decisionText: d.decisionText,
                }))}
                actionItems={meeting.actionItems.map((a) => ({
                  id: a.id,
                  task: a.task,
                  responsiblePerson: a.responsiblePerson,
                  deadline: a.deadline,
                  status: a.status as "PENDING" | "IN_PROGRESS" | "DONE",
                }))}
              />
            )}

            {/* ── Sentiment dashboard ── */}
            {isAnalyzed && (
              <div>
                {/* Section header */}
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-base font-semibold text-white flex items-center gap-2">
                    <BarChart2 size={16} className="text-purple-400" />
                    Sentiment Analysis
                  </h2>
                  {!hasSentiment && (
                    <p className="text-xs text-slate-500">
                      Click{" "}
                      <span className="text-purple-400">
                        Sentiment Analysis
                      </span>{" "}
                      above to run
                    </p>
                  )}
                </div>

                {hasSentiment ? (
                  <SentimentDashboard
                    data={meeting.sentiments.map((s) => ({
                      id: s.id,
                      speaker: s.speaker,
                      sentimentScore: s.sentimentScore,
                      sentimentLabel: s.sentimentLabel,
                      segment: s.segment
                        ? {
                            text: s.segment.text,
                            startTime: s.segment.startTime,
                          }
                        : null,
                    }))}
                  />
                ) : (
                  /* Placeholder until user runs sentiment */
                  <div className="bg-[#1e1c32] border border-purple-700/20 rounded-2xl p-6 text-center opacity-70">
                    <div className="w-12 h-12 rounded-2xl bg-purple-600/10 border border-purple-600/20 flex items-center justify-center mx-auto mb-3">
                      <BarChart2 size={20} className="text-purple-400" />
                    </div>
                    <h3 className="text-white font-medium text-sm mb-1">
                      Sentiment not yet analyzed
                    </h3>
                    <p className="text-slate-500 text-xs leading-relaxed max-w-xs mx-auto">
                      Run sentiment analysis to see tone, speaker mood, and
                      conflict areas visualized with charts.
                    </p>
                    <div className="flex justify-center gap-3 mt-4 text-xs text-slate-600">
                      <span>✅ Aligned speakers</span>
                      <span>⚠️ Uncertain areas</span>
                      <span>🔥 Conflict points</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right — transcript viewer (2/5) */}
          <div className="lg:col-span-2">
            <div className="bg-[#1e1c32] border border-slate-700/50 rounded-2xl overflow-hidden sticky top-20">
              <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-700/50">
                <BookOpen size={15} className="text-slate-400" />
                <h2 className="font-medium text-white text-sm">Transcript</h2>
                <span className="ml-auto text-xs text-slate-500">
                  {meeting.segments.length} segments
                </span>
              </div>
              <TranscriptViewer
                segments={meeting.segments.map((s) => ({
                  id: s.id,
                  speaker: s.speaker,
                  text: s.text,
                  startTime: s.startTime,
                  sequence: s.sequence,
                }))}
              />
            </div>
          </div>
        </div>

        <div>
          <div className="flex items-center gap-2 mb-4">
            <MessageSquare size={16} className="text-indigo-400" />
            <h2 className="text-base font-semibold text-white">
              Chat with this meeting
            </h2>
          </div>
          <ChatPanel
            meetingId={meeting.id}
            projectId={meeting.project.id}
            meetingFileName={meeting.fileName}
          />
        </div>
      </main>
    </div>
  );
}
