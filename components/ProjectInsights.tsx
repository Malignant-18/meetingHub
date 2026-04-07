"use client";
// components/ProjectInsights.tsx

import { useState } from "react";
import {
  BrainCircuit,
  Calendar,
  CheckSquare,
  Loader2,
  MessageSquareHeart,
  RefreshCw,
  TrendingUp,
  Users,
} from "lucide-react";
import {
  type ProjectDecisionSummary,
  type ProjectSentimentSummary,
} from "@/lib/project-insights";
import { cn, formatDate } from "@/lib/utils";

interface Props {
  projectId: string;
  initialDecisions: ProjectDecisionSummary;
  initialSentiment: ProjectSentimentSummary;
}

const SENTIMENT_PILL = {
  positive: "bg-emerald-500/15 text-emerald-300 border border-emerald-500/20",
  neutral: "bg-slate-500/15 text-slate-300 border border-slate-500/20",
  negative: "bg-amber-500/15 text-amber-300 border border-amber-500/20",
  conflict: "bg-red-500/15 text-red-300 border border-red-500/20",
  no_data: "bg-[#26a269]/10 text-[#9fd8ad] border border-[#26a269]/20",
} as const;

const SENTIMENT_BAR = {
  positive: "bg-emerald-400",
  neutral: "bg-slate-400",
  negative: "bg-amber-400",
  conflict: "bg-red-400",
} as const;

export default function ProjectInsights({
  projectId,
  initialDecisions,
  initialSentiment,
}: Props) {
  const [decisions, setDecisions] = useState(initialDecisions);
  const [sentiment, setSentiment] = useState(initialSentiment);
  const [runningDecisions, setRunningDecisions] = useState(false);
  const [runningSentiment, setRunningSentiment] = useState(false);
  const [decisionsError, setDecisionsError] = useState<string | null>(null);
  const [sentimentError, setSentimentError] = useState<string | null>(null);

  const runDecisions = async () => {
    setRunningDecisions(true);
    setDecisionsError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/decisions`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error ?? "Failed");
      setDecisions(data.data);
    } catch (e: any) {
      setDecisionsError(e.message);
    } finally {
      setRunningDecisions(false);
    }
  };

  const runSentiment = async () => {
    setRunningSentiment(true);
    setSentimentError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/sentiment`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error ?? "Failed");
      setSentiment(data.data);
    } catch (e: any) {
      setSentimentError(e.message);
    } finally {
      setRunningSentiment(false);
    }
  };

  return (
    <div className="mt-10 grid gap-5 ">
      {/* ── Decisions panel ── */}
      <section className="rounded-[28px] border border-[#26a269]/20 bg-[#081004]/80 p-6 shadow-[0_16px_40px_rgba(0,0,0,0.20)] backdrop-blur-xl">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm font-medium text-[#69FF97]">
              <BrainCircuit size={15} />
              Decision extractor
            </div>
            <h2 className="mt-2 text-lg font-semibold text-[#f6fff7]">
              Decisions &amp; action items
            </h2>
          </div>
          <button
            onClick={runDecisions}
            disabled={runningDecisions}
            className="inline-flex items-center gap-2 rounded-full bg-[#26a269] px-4 py-2.5 text-sm font-medium text-[#041102] transition-colors hover:bg-[#30bb77] disabled:opacity-50 flex-shrink-0"
          >
            {runningDecisions ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <RefreshCw size={14} />
            )}
            {decisions.totalDecisions > 0 ? "Refresh" : "Run extractor"}
          </button>
        </div>

        {decisionsError && (
          <p className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {decisionsError}
          </p>
        )}

        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          {/* Decisions list */}
          <div className="rounded-[20px] border border-[#26a269]/20 bg-[#0a1406]/60 p-4">
            <h3 className="text-sm font-medium text-[#f6fff7] mb-3">
              Decisions
            </h3>
            {decisions.decisions.length === 0 ? (
              <p className="text-xs text-[#70907a] leading-relaxed">
                No decisions extracted yet. Run the extractor to pull them from
                all meetings.
              </p>
            ) : (
              <div className="max-h-[320px] space-y-2.5 overflow-y-auto pr-1">
                {decisions.decisions.map((d) => (
                  <div
                    key={d.id}
                    className="rounded-xl border border-[#26a269]/15 bg-[#0d1808] p-3"
                  >
                    <p className="text-xs leading-relaxed text-[#d5f5dc]">
                      {d.text}
                    </p>
                    <div className="mt-2 flex items-center justify-between text-[10px] text-[#70907a]">
                      <span>{d.meetingTitle}</span>
                      <span>{formatDate(d.meetingCreatedAt)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Action items list */}
          <div className="rounded-[20px] border border-[#26a269]/20 bg-[#0a1406]/60 p-4">
            <h3 className="text-sm font-medium text-[#f6fff7] mb-3">
              Action tracker
            </h3>
            {decisions.actionItems.length === 0 ? (
              <p className="text-xs text-[#70907a] leading-relaxed">
                No action items stored yet.
              </p>
            ) : (
              <div className="max-h-[320px] space-y-2.5 overflow-y-auto pr-1">
                {decisions.actionItems.map((a) => (
                  <div
                    key={a.id}
                    className="rounded-xl border border-[#26a269]/15 bg-[#0d1808] p-3"
                  >
                    <p className="text-xs leading-relaxed text-[#d5f5dc]">
                      {a.task}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1.5 text-[10px]">
                      <span className="rounded-full border border-[#26a269]/15 bg-[#10200f] px-2 py-0.5 text-[#9fd8ad]">
                        {a.meetingTitle}
                      </span>
                      <span className="rounded-full border border-[#26a269]/15 bg-[#10200f] px-2 py-0.5 text-[#9fd8ad]">
                        {a.responsiblePerson ?? "Unknown"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── Sentiment panel ── */}
      <section className="rounded-[28px] border border-[#26a269]/20 bg-[#081004]/80 p-6 shadow-[0_16px_40px_rgba(0,0,0,0.20)] backdrop-blur-xl">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm font-medium text-[#00E4FF]">
              <MessageSquareHeart size={15} />
              Sentiment dashboard
            </div>
            <h2 className="mt-2 text-lg font-semibold text-[#f6fff7]">
              Speaker tone trends
            </h2>
          </div>
          <button
            onClick={runSentiment}
            disabled={runningSentiment}
            className="inline-flex items-center gap-2 rounded-full border border-[#26a269]/20 bg-[#0d1808] px-4 py-2.5 text-sm font-medium text-[#9fd8ad] transition-colors hover:border-[#26a269]/35 hover:text-[#d5f5dc] disabled:opacity-50 flex-shrink-0"
          >
            {runningSentiment ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <RefreshCw size={14} />
            )}
            {sentiment.totalSegments > 0 ? "Refresh" : "Run sentiment"}
          </button>
        </div>

        {sentimentError && (
          <p className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {sentimentError}
          </p>
        )}

        <div className="mt-5 grid grid-cols-1 lg:grid-cols-5 gap-4">
          {/* Speaker breakdown */}
          <div className="lg:col-span-3 rounded-[20px] border border-[#26a269]/20 bg-[#0a1406]/60 p-4">
            <h3 className="text-sm font-medium text-[#f6fff7] mb-4">
              Speaker breakdown
            </h3>

            {sentiment.speakerSummaries.length === 0 ? (
              <p className="text-xs text-[#70907a] leading-relaxed">
                No sentiment data yet. Run the dashboard to create speaker
                summaries.
              </p>
            ) : (
              <div className="space-y-4 max-h-[280px] overflow-y-auto pr-1">
                {sentiment.speakerSummaries.map((speaker) => (
                  <div key={speaker.speaker}>
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-[#d5f5dc]">
                          {speaker.speaker}
                        </p>
                        <p className="text-[11px] text-[#70907a]">
                          {speaker.totalSegments} segments ·{" "}
                          {speaker.meetingCount} meeting
                          {speaker.meetingCount !== 1 ? "s" : ""}
                        </p>
                      </div>

                      <div className="text-right">
                        <span
                          className={cn(
                            "rounded-full px-2 py-0.5 text-[10px] font-medium capitalize",
                            SENTIMENT_PILL[speaker.dominantLabel],
                          )}
                        >
                          {speaker.dominantLabel}
                        </span>

                        <p className="mt-0.5 text-sm font-semibold text-[#f6fff7]">
                          {speaker.averageScore}
                        </p>
                      </div>
                    </div>

                    <div className="mt-2 flex h-1.5 overflow-hidden rounded-full bg-[#0d1808]">
                      {(
                        ["positive", "neutral", "negative", "conflict"] as const
                      ).map((label) => {
                        const pct =
                          speaker.totalSegments > 0
                            ? (speaker.distribution[label] /
                                speaker.totalSegments) *
                              100
                            : 0;

                        return (
                          <div
                            key={label}
                            className={cn("h-full", SENTIMENT_BAR[label])}
                            style={{ width: `${pct}%` }}
                          />
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Meeting timeline */}
          {sentiment.meetingSummaries.length > 0 && (
            <div className="lg:col-span-2 rounded-[20px] border border-[#26a269]/20 bg-[#0a1406]/60 p-4">
              <h3 className="text-sm font-medium text-[#f6fff7] mb-4">
                Meeting timeline
              </h3>

              <div className="space-y-4">
                {sentiment.meetingSummaries.map((m) => (
                  <div key={m.meetingId}>
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm text-[#d5f5dc]">
                          {m.meetingTitle}
                        </p>

                        <p className="text-[11px] text-[#70907a]">
                          {formatDate(m.createdAt)} · {m.segmentCount} segments
                        </p>
                      </div>

                      <div className="flex flex-shrink-0 items-center gap-2">
                        <span
                          className={cn(
                            "rounded-full px-2 py-0.5 text-[10px] font-medium capitalize",
                            SENTIMENT_PILL[m.dominantLabel],
                          )}
                        >
                          {m.dominantLabel}
                        </span>

                        <span className="text-sm font-semibold text-[#f6fff7]">
                          {m.averageScore}
                        </span>
                      </div>
                    </div>

                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#0d1808]">
                      <div
                        className={cn(
                          "h-full rounded-full",
                          m.averageScore >= 70
                            ? "bg-emerald-400"
                            : m.averageScore >= 45
                              ? "bg-[#00E4FF]"
                              : m.averageScore >= 25
                                ? "bg-amber-400"
                                : "bg-red-400",
                        )}
                        style={{ width: `${m.averageScore}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
