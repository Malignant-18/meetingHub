"use client";
import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import AnalyzeButton from "@/components/AnalyzeButton";
import SentimentButton from "@/components/SentimentButton";
import ResetMeetingAIButton from "@/components/ResetMeetingAIButton";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  ArrowLeft,
  FileText,
  Users,
  AlignLeft,
  Calendar,
  CheckSquare,
  Lightbulb,
  BarChart2,
  MessageSquare,
  BookOpen,
  Clock,
  Loader2,
  CheckCircle2,
  Circle,
  Sparkles,
  Link2,
} from "lucide-react";
import { cn, formatDate } from "@/lib/utils";
import TranscriptPanel, {
  type TranscriptSegmentData,
} from "@/components/TranscriptPanel";
import SentimentDashboard from "@/components/SentimentDashboard";

// ─── Types ────────────────────────────────────────────────────────────────────
interface Decision {
  id: string;
  decisionText: string;
  contextSegmentId: string | null;
}
interface ActionItem {
  id: string;
  task: string;
  responsiblePerson: string | null;
  deadline: string | null;
  status: "PENDING" | "IN_PROGRESS" | "DONE";
}
interface SentimentRecord {
  id: string;
  speaker: string;
  sentimentScore: number;
  sentimentLabel: string;
  segment: { text: string; startTime: string | null } | null;
}
interface SpeakerStat {
  speaker: string;
  segments: number;
}
interface Props {
  meeting: {
    id: string;
    title: string;
    fileName: string;
    status: string;
    speakerCount: number;
    wordCount: number;
    createdAt: Date | string;
    project: { id: string; name: string };
  };
  decisions: Decision[];
  actionItems: ActionItem[];
  sentiments: SentimentRecord[];
  transcriptSegments: TranscriptSegmentData[];
  speakerStats: SpeakerStat[];
}

// ─── Status config ────────────────────────────────────────────────────────────
const STATUS_CFG: Record<string, { label: string; className: string }> = {
  UPLOADED: {
    label: "Uploaded",
    className: "bg-[#26a269]/10 text-[#69FF97] border border-[#26a269]/20",
  },
  PARSING: {
    label: "Parsing…",
    className:
      "bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 animate-pulse",
  },
  PARSED: {
    label: "Parsed",
    className: "bg-[#00E4FF]/10 text-[#00E4FF] border border-[#00E4FF]/20",
  },
  ANALYZING: {
    label: "Analyzing…",
    className:
      "bg-amber-500/10 text-amber-300 border border-amber-500/20 animate-pulse",
  },
  ANALYZED: {
    label: "Analyzed",
    className: "bg-[#26a269]/15 text-[#69FF97] border border-[#26a269]/25",
  },
  ERROR: {
    label: "Error",
    className: "bg-red-500/10 text-red-300 border border-red-500/20",
  },
};

// ─── Action item status helpers ───────────────────────────────────────────────
const STATUS_CYCLE: Record<ActionItem["status"], ActionItem["status"]> = {
  PENDING: "IN_PROGRESS",
  IN_PROGRESS: "DONE",
  DONE: "PENDING",
};
const STATUS_PILL: Record<
  ActionItem["status"],
  { label: string; icon: React.ReactNode; className: string }
> = {
  PENDING: {
    label: "Pending",
    icon: <Circle size={11} />,
    className: "text-slate-400 bg-slate-800/60 border-slate-700/40",
  },
  IN_PROGRESS: {
    label: "In progress",
    icon: <Loader2 size={11} />,
    className: "text-amber-400 bg-amber-900/20 border-amber-700/30",
  },
  DONE: {
    label: "Done",
    icon: <CheckCircle2 size={11} />,
    className: "text-emerald-400 bg-emerald-900/20 border-emerald-700/30",
  },
};

// ─── CSV export ───────────────────────────────────────────────────────────────
function exportCSV(
  decisions: Decision[],
  actionItems: ActionItem[],
  title: string,
) {
  const esc = (v: string | null | undefined) =>
    `"${(v ?? "").replace(/"/g, '""')}"`;
  const csv = [
    "DECISIONS",
    ["Type", "Content"].map(esc).join(","),
    ...decisions.map((d) => ["Decision", d.decisionText].map(esc).join(",")),
    "",
    "ACTION ITEMS",
    ["Task", "Responsible", "Deadline", "Status"].map(esc).join(","),
    ...actionItems.map((a) =>
      [
        a.task,
        a.responsiblePerson ?? "Unassigned",
        a.deadline ?? "Not specified",
        a.status,
      ]
        .map(esc)
        .join(","),
    ),
  ].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${title.replace(/[^a-z0-9]/gi, "_")}_analysis.csv`;
  a.click();
  URL.revokeObjectURL(url);
  toast.success("CSV exported!");
}

// ─── Custom chart tooltip ─────────────────────────────────────────────────────
const GreenTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-[#26a269]/20 bg-[#0a1406]/95 px-3 py-2 text-xs shadow-xl backdrop-blur">
      <p className="font-medium text-[#d5f5dc]">{label ?? payload[0]?.name}</p>
      <p className="text-[#69FF97]">{payload[0]?.value}</p>
    </div>
  );
};

// ─── Main component ───────────────────────────────────────────────────────────
export default function MeetingDetailClient({
  meeting,
  decisions,
  actionItems,
  sentiments,
  transcriptSegments,
  speakerStats,
}: Props) {
  const [mainTab, setMainTab] = useState<"insights" | "sentiment" | "chat">(
    "insights",
  );
  const [tab, setTab] = useState<"decisions" | "actions">("decisions");
  const [items, setItems] = useState<ActionItem[]>(actionItems);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [transcriptOpen, setTranscriptOpen] = useState(false);
  const [highlightIds, setHighlightIds] = useState<string[]>([]);

  useEffect(() => {
    setItems(actionItems);
  }, [actionItems]);

  const isAnalyzed = meeting.status === "ANALYZED";
  const canAnalyze = ["PARSED", "ANALYZED", "ERROR"].includes(meeting.status);
  const hasSentiment = sentiments.length > 0;
  const hasAiData =
    decisions.length > 0 || actionItems.length > 0 || sentiments.length > 0;
  const status = STATUS_CFG[meeting.status] ?? STATUS_CFG["UPLOADED"];

  // ── Derived stats ─────────────────────────────────────────────────────────
  const pendingCount = items.filter((a) => a.status === "PENDING").length;
  const inProgressCount = items.filter(
    (a) => a.status === "IN_PROGRESS",
  ).length;
  const doneCount = items.filter((a) => a.status === "DONE").length;

  const actionStatusData = [
    { name: "Pending", value: pendingCount, color: "#94a3b8" },
    { name: "In progress", value: inProgressCount, color: "#f59e0b" },
    { name: "Done", value: doneCount, color: "#10b981" },
  ].filter((d) => d.value > 0);

  const speakerBarData = speakerStats.map((s) => ({
    name: s.speaker.length > 10 ? s.speaker.slice(0, 10) + "…" : s.speaker,
    speaker: s.speaker,
    segments: s.segments,
  }));

  // ── Open transcript panel ─────────────────────────────────────────────────
  const openTranscript = (segmentIds: string[] = []) => {
    setHighlightIds(segmentIds);
    setTranscriptOpen(true);
  };

  const openTranscriptBySpeaker = (speaker: string) => {
    const speakerSegmentIds = transcriptSegments
      .filter((segment) => segment.speaker === speaker)
      .map((segment) => segment.id);

    if (speakerSegmentIds.length === 0) {
      toast.error(`No transcript lines found for ${speaker}`);
      return;
    }

    openTranscript(speakerSegmentIds);
  };

  // ── Status toggle ─────────────────────────────────────────────────────────
  const toggleStatus = async (item: ActionItem) => {
    const next = STATUS_CYCLE[item.status];
    setUpdatingId(item.id);
    setItems((prev) =>
      prev.map((a) => (a.id === item.id ? { ...a, status: next } : a)),
    );
    try {
      const res = await fetch(`/api/action-items/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      if (!res.ok) throw new Error("Update failed");
      //toast.success(`Marked as ${next.toLowerCase().replace("_", " ")}`);
    } catch {
      setItems((prev) =>
        prev.map((a) => (a.id === item.id ? { ...a, status: item.status } : a)),
      );
      toast.error("Failed to update status");
    } finally {
      setUpdatingId(null);
    }
  };

  // ── Tab definitions ───────────────────────────────────────────────────────
  const tabs = [
    { id: "insights" as const, label: "Insights", icon: Lightbulb },
    { id: "sentiment" as const, label: "Sentiment", icon: BarChart2 },
    { id: "chat" as const, label: "AI Chat", icon: MessageSquare },
  ];

  return (
    <>
      {/* ── Background — matches project page ── */}
      <main className="relative z-10 mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 space-y-8">
        {/* ── Hero card — cleaner, more spacious ── */}
        <section className="rounded-[28px] border border-[#26a269]/10 bg-[#081004]/80 px-6 py-7 shadow-[0_24px_60px_rgba(0,0,0,0.32)] backdrop-blur-xl sm:px-8">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 text-sm text-[#8fb79a]">
            <Link
              href="/dashboard"
              className="hover:text-[#d5f5dc] transition-colors"
            >
              Dashboard
            </Link>
            <span className="text-[#26a269]/40">/</span>
            <Link
              href={`/projects/${meeting.project.id}`}
              className="hover:text-[#d5f5dc] transition-colors max-w-36 truncate"
            >
              {meeting.project.name}
            </Link>
            <span className="text-[#26a269]/40">/</span>
            <span className="text-[#d5f5dc] truncate max-w-40">
              {meeting.title}
            </span>
          </nav>

          {/* Title + metadata row */}
          <div className="mt-5 flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-3">
              <div>
                <div className="flex items-center gap-3 flex-wrap">
                  <h1 className="text-3xl font-semibold tracking-[-0.03em] text-[#f6fff7]">
                    {meeting.title}
                  </h1>
                  <span
                    className={cn(
                      "rounded-full px-3 py-1 text-[11px] font-medium",
                      status.className,
                    )}
                  >
                    {status.label}
                  </span>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-6 text-xs text-[#70907a]">
                  <span className="flex items-center gap-1.5">
                    <Calendar size={13} />
                    {formatDate(meeting.createdAt)}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Users size={13} />
                    {meeting.speakerCount} speaker
                    {meeting.speakerCount !== 1 ? "s" : ""}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <AlignLeft size={13} />
                    {meeting.wordCount.toLocaleString()} words
                  </span>
                  <span className="flex items-center gap-1.5">
                    <FileText size={13} />
                    {transcriptSegments.length} segments
                  </span>
                </div>
              </div>
            </div>

            {/* Transcript button — more prominent */}
            {transcriptSegments.length > 0 && (
              <button
                onClick={() => openTranscript()}
                className={cn(
                  "flex items-center gap-2 rounded-3xl border px-5 py-3 text-sm font-medium transition-all ",
                  transcriptOpen
                    ? "border-[#26a269]/40 bg-[#10200f] text-[#69FF97]"
                    : "border-[#26a269]/18 bg-[#0d1808]/70 text-[#9fd8ad] hover:border-[#26a269]/34 hover:text-[#d5f5dc]",
                )}
              >
                <BookOpen size={16} />
                View full transcript
              </button>
            )}
          </div>
        </section>

        <div className="flex flex-wrap items-center gap-3">
          {canAnalyze && (
            <AnalyzeButton meetingId={meeting.id} isAnalyzed={isAnalyzed} />
          )}
          {isAnalyzed && (
            <SentimentButton meetingId={meeting.id} hasResults={hasSentiment} />
          )}
          {hasAiData && <ResetMeetingAIButton meetingId={meeting.id} />}
        </div>

        {/* ── Not analyzed state ── */}
        {!isAnalyzed && meeting.status !== "ANALYZING" && (
          <div className="rounded-[28px] border border-[#26a269]/12 bg-[#081004]/70 px-6 py-12 text-center backdrop-blur-xl">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-[18px] border border-[#26a269]/16 bg-[#0d1808] text-[#69FF97]">
              <Sparkles size={22} />
            </div>
            <h2 className="text-lg font-semibold text-[#f6fff7]">
              Ready to analyze
            </h2>
            <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-[#8fb79a]">
              Use the <span className="text-[#69FF97]">Run AI Analysis</span>{" "}
              button in the header to extract decisions and action items.
            </p>
          </div>
        )}

        {/* ── Analyzing spinner ── */}
        {meeting.status === "ANALYZING" && (
          <div className="rounded-[28px] border border-amber-500/15 bg-[#0d0900]/60 px-6 py-10 text-center backdrop-blur-xl">
            <div className="mx-auto mb-4 h-10 w-10 rounded-full border-2 border-amber-500 border-t-transparent animate-spin" />
            <p className="font-medium text-amber-300">
              Gemini is analyzing your transcript…
            </p>
            <p className="mt-1 text-sm text-[#8fb79a]">
              Usually 10–30 seconds.
            </p>
          </div>
        )}

        {/* ── Error ── */}
        {meeting.status === "ERROR" && (
          <div className="rounded-[28px] border border-red-500/15 bg-red-950/20 px-6 py-6 backdrop-blur-xl">
            <p className="font-medium text-red-300">
              Analysis failed — check your Gemini API key and try again.
            </p>
          </div>
        )}

        {/* ── MAIN TABBED CONTENT (only when fully analyzed) ── */}
        {isAnalyzed && (
          <>
            {/* Modern tab menu — clean segmented control */}
            <div className="flex justify-center">
              <div className="inline-flex rounded-3xl bg-[#0a1406]/80 p-1.5 border border-[#26a269]/10 shadow-inner backdrop-blur-xl">
                {tabs.map((t) => {
                  const Icon = t.icon;
                  const isActive = mainTab === t.id;
                  return (
                    <button
                      key={t.id}
                      onClick={() => setMainTab(t.id)}
                      className={cn(
                        "flex items-center gap-2.5 rounded-3xl px-7 py-3 text-sm font-medium transition-all",
                        isActive
                          ? "bg-[#081004] text-[#f6fff7] shadow-md"
                          : "text-[#70907a] hover:text-[#d5f5dc] hover:bg-[#0d1808]/60",
                      )}
                    >
                      <Icon
                        size={17}
                        className={isActive ? "text-[#69FF97]" : ""}
                      />
                      {t.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Insights Tab */}
            {mainTab === "insights" && (
              <div className="space-y-8">
                {/* Mini visual summary cards — only shown in Insights */}
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  {/* Action progress donut */}
                  {actionStatusData.length > 0 && (
                    <div className="rounded-3xl border border-[#26a269]/12 bg-[#081004]/80 p-6 backdrop-blur-xl">
                      <h3 className="mb-4 text-xs font-medium uppercase tracking-[0.18em] text-[#70907a]">
                        Action item progress
                      </h3>
                      <div className="flex items-center gap-6">
                        <ResponsiveContainer width={110} height={110}>
                          <PieChart>
                            <Pie
                              data={actionStatusData}
                              innerRadius={34}
                              outerRadius={52}
                              paddingAngle={4}
                              dataKey="value"
                            >
                              {actionStatusData.map((entry, i) => (
                                <Cell key={i} fill={entry.color} />
                              ))}
                            </Pie>
                            <Tooltip content={<GreenTooltip />} />
                          </PieChart>
                        </ResponsiveContainer>
                        <div className="space-y-3 flex-1">
                          {actionStatusData.map((d) => (
                            <div
                              key={d.name}
                              className="flex items-center gap-3"
                            >
                              <span
                                className="h-3 w-3 rounded-full flex-shrink-0"
                                style={{ background: d.color }}
                              />
                              <span className="text-sm text-[#8fb79a]">
                                {d.name}
                              </span>
                              <span className="ml-auto text-lg font-semibold text-[#f6fff7]">
                                {d.value}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Speaker activity bar */}
                  {speakerBarData.length > 0 && (
                    <div className="rounded-3xl border border-[#26a269]/12 bg-[#081004]/80 p-6 backdrop-blur-xl">
                      <h3 className="mb-4 text-xs font-medium uppercase tracking-[0.18em] text-[#70907a]">
                        Speaker activity
                      </h3>
                      <ResponsiveContainer width="100%" height={150}>
                        <BarChart
                          data={speakerBarData}
                          margin={{ top: 0, right: 0, left: -20, bottom: 0 }}
                        >
                          <XAxis
                            dataKey="name"
                            tick={{ fontSize: 11, fill: "#70907a" }}
                            axisLine={false}
                            tickLine={false}
                          />
                          <YAxis
                            tick={{ fontSize: 11, fill: "#4a6050" }}
                            axisLine={false}
                            tickLine={false}
                          />
                          <Tooltip
                            content={<GreenTooltip />}
                            cursor={{ fill: "rgba(38,162,105,0.06)" }}
                          />
                          <Bar
                            dataKey="segments"
                            fill="#26a269"
                            radius={[4, 4, 0, 0]}
                            maxBarSize={42}
                            onClick={(payload) =>
                              payload?.speaker
                                ? openTranscriptBySpeaker(payload.speaker)
                                : undefined
                            }
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>

                {/* Decisions & Action Items panel — full width, clean */}
                <div className="rounded-[28px] border border-[#26a269]/12 bg-[#081004]/80 shadow-[0_18px_48px_rgba(0,0,0,0.28)] backdrop-blur-xl overflow-hidden">
                  {/* Internal sub-tabs */}
                  <div className="flex items-center justify-between border-b border-[#26a269]/10 px-5 py-4">
                    <div className="flex gap-1 rounded-3xl bg-[#0a1406]/60 p-1">
                      {(["decisions", "actions"] as const).map((t) => (
                        <button
                          key={t}
                          onClick={() => setTab(t)}
                          className={cn(
                            "flex items-center gap-2 rounded-3xl px-5 py-2 text-sm font-medium transition-all",
                            tab === t
                              ? "bg-[#0f1b0d] text-[#f6fff7] shadow-sm"
                              : "text-[#70907a] hover:text-[#d5f5dc]",
                          )}
                        >
                          {t === "decisions" ? (
                            <Lightbulb
                              size={15}
                              className={
                                tab === "decisions" ? "text-[#69FF97]" : ""
                              }
                            />
                          ) : (
                            <CheckSquare
                              size={15}
                              className={
                                tab === "actions" ? "text-[#00E4FF]" : ""
                              }
                            />
                          )}
                          {t === "decisions" ? "Decisions" : "Action items"}
                          <span
                            className={cn(
                              "rounded-full px-2 py-0.5 text-xs",
                              tab === t
                                ? "bg-[#26a269]/20 text-[#69FF97]"
                                : "bg-[#0d1808] text-[#70907a]",
                            )}
                          >
                            {t === "decisions"
                              ? decisions.length
                              : items.length}
                          </span>
                        </button>
                      ))}
                    </div>

                    <button
                      onClick={() => exportCSV(decisions, items, meeting.title)}
                      className="flex items-center gap-1.5 rounded-3xl border border-[#26a269]/14 bg-[#0d1808]/60 px-4 py-2 text-xs text-[#8fb79a] transition-colors hover:border-[#26a269]/28 hover:text-[#d5f5dc]"
                    >
                      Export CSV
                    </button>
                  </div>

                  {/* Decisions content */}
                  {tab === "decisions" && (
                    <div>
                      {decisions.length === 0 ? (
                        <div className="py-16 text-center">
                          <Lightbulb
                            size={24}
                            className="mx-auto mb-3 text-[#26a269]/30"
                          />
                          <p className="text-sm text-[#70907a]">
                            No decisions found yet
                          </p>
                        </div>
                      ) : (
                        <div className="divide-y divide-[#26a269]/8">
                          {decisions.map((d, i) => (
                            <div
                              key={d.id}
                              className="group flex items-start gap-5 px-6 py-5 transition-colors hover:bg-[#26a269]/4"
                            >
                              <div className="mt-px flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-2xl border border-[#26a269]/20 bg-[#0d1808]">
                                <span className="text-xs font-bold text-[#69FF97]">
                                  {i + 1}
                                </span>
                              </div>
                              <p className="flex-1 text-[15px] leading-relaxed text-[#d5f5dc]">
                                {d.decisionText}
                              </p>
                              {d.contextSegmentId && (
                                <button
                                  onClick={() =>
                                    openTranscript([d.contextSegmentId!])
                                  }
                                  className="mt-1 flex-shrink-0 rounded-2xl border border-[#26a269]/15 p-3 text-[#26a269]/50 opacity-0 transition-all group-hover:opacity-100 hover:border-[#26a269]/35 hover:text-[#69FF97]"
                                >
                                  <Link2 size={15} />
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Action items content */}
                  {tab === "actions" && (
                    <div>
                      {items.length === 0 ? (
                        <div className="py-16 text-center">
                          <CheckSquare
                            size={24}
                            className="mx-auto mb-3 text-[#26a269]/30"
                          />
                          <p className="text-sm text-[#70907a]">
                            No action items found yet
                          </p>
                        </div>
                      ) : (
                        <>
                          {/* Status summary bar */}
                          <div className="flex items-center gap-8 border-b border-[#26a269]/8 bg-[#0a1406]/40 px-6 py-4 text-sm text-[#70907a]">
                            <span className="flex items-center gap-2">
                              <span className="inline-block h-2 w-2 rounded-full bg-slate-400"></span>
                              {pendingCount} pending
                            </span>
                            <span className="flex items-center gap-2 text-amber-400">
                              <span className="inline-block h-2 w-2 rounded-full bg-amber-400"></span>
                              {inProgressCount} in progress
                            </span>
                            <span className="flex items-center gap-2 text-emerald-400">
                              <span className="inline-block h-2 w-2 rounded-full bg-emerald-400"></span>
                              {doneCount} done
                            </span>
                          </div>

                          {/* Table header */}
                          <div className="grid grid-cols-12 gap-3 border-b border-[#26a269]/8 px-6 py-3 text-[10px] font-medium uppercase tracking-wider text-[#70907a]">
                            <div className="col-span-5">Task</div>
                            <div className="col-span-3">Responsible</div>
                            <div className="col-span-2">Deadline</div>
                            <div className="col-span-2">Status</div>
                          </div>

                          <div className="divide-y divide-[#26a269]/6">
                            {items.map((item) => {
                              const pill = STATUS_PILL[item.status];
                              return (
                                <div
                                  key={item.id}
                                  className={cn(
                                    "grid grid-cols-12 items-start gap-3 px-6 py-5 transition-colors hover:bg-[#26a269]/3",
                                    item.status === "DONE" && "opacity-60",
                                  )}
                                >
                                  <div className="col-span-5">
                                    <p
                                      className={cn(
                                        "text-[15px] leading-snug text-[#d5f5dc]",
                                        item.status === "DONE" &&
                                          "line-through text-[#70907a]",
                                      )}
                                    >
                                      {item.task}
                                    </p>
                                  </div>
                                  <div className="col-span-3">
                                    {item.responsiblePerson ? (
                                      <span className="inline-flex items-center gap-2 rounded-3xl border border-[#26a269]/16 bg-[#0d1808] px-3 py-1 text-xs text-[#9fd8ad]">
                                        <span className="flex h-5 w-5 items-center justify-center rounded-2xl bg-[#26a269]/20 text-[10px] font-bold uppercase text-[#69FF97]">
                                          {item.responsiblePerson[0]}
                                        </span>
                                        {item.responsiblePerson}
                                      </span>
                                    ) : (
                                      <span className="text-xs text-[#70907a]">
                                        Unassigned
                                      </span>
                                    )}
                                  </div>
                                  <div className="col-span-2 text-xs text-[#8fb79a]">
                                    {item.deadline &&
                                    item.deadline !== "Not specified" ? (
                                      <span className="flex items-center gap-1.5">
                                        <Clock size={12} />
                                        {item.deadline}
                                      </span>
                                    ) : (
                                      "—"
                                    )}
                                  </div>
                                  <div className="col-span-2">
                                    <button
                                      onClick={() => toggleStatus(item)}
                                      disabled={updatingId === item.id}
                                      className={cn(
                                        "flex items-center gap-2 rounded-3xl border px-3 py-1 text-xs font-medium transition-all hover:opacity-90 disabled:cursor-not-allowed",
                                        pill.className,
                                      )}
                                    >
                                      {updatingId === item.id ? (
                                        <Loader2
                                          size={12}
                                          className="animate-spin"
                                        />
                                      ) : (
                                        pill.icon
                                      )}
                                      <span className="hidden sm:inline">
                                        {pill.label}
                                      </span>
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Sentiment Tab */}
            {mainTab === "sentiment" && (
              <div className="rounded-[28px] bg-[#081004]/60 p-8 shadow-[0_18px_48px_rgba(0,0,0,0.28)] backdrop-blur-xl">
                <div className="mb-6 flex items-center gap-3">
                  <BarChart2 size={18} className="text-[#00E4FF]" />
                  <h2 className="text-lg font-semibold text-[#f6fff7]">
                    Speaker Sentiment &amp; Tone Analysis
                  </h2>
                </div>

                {hasSentiment ? (
                  <SentimentDashboard
                    data={sentiments}
                    onSpeakerSelect={openTranscriptBySpeaker}
                  />
                ) : (
                  <div className="rounded-3xl border border-dashed border-[#26a269]/30 py-16 text-center">
                    <BarChart2
                      size={28}
                      className="mx-auto mb-4 text-[#26a269]/30"
                    />
                    <p className="text-sm font-medium text-[#d5f5dc]">
                      Sentiment analysis not yet run
                    </p>
                    <p className="mx-auto mt-2 max-w-xs text-xs text-[#70907a]">
                      Click the{" "}
                      <span className="text-[#00E4FF]">Sentiment Analysis</span>{" "}
                      button in the top bar to generate tone insights.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* AI Chat Tab */}
            {mainTab === "chat" && (
              <div className="rounded-[28px] border border-[#26a269]/12 bg-[#081004]/80 p-8 shadow-[0_18px_48px_rgba(0,0,0,0.28)] backdrop-blur-xl">
                <div className="mx-auto max-w-xl">
                  <div className="flex justify-center mb-6">
                    <div className="flex items-center gap-2 rounded-3xl bg-[#0d1808] px-5 py-2 text-[#69FF97]">
                      <MessageSquare size={18} />
                      <span className="font-medium">
                        Contextual Query Engine
                      </span>
                    </div>
                  </div>

                  <h2 className="text-center text-2xl font-semibold tracking-tight text-[#f6fff7]">
                    Ask anything about this meeting
                  </h2>
                  <p className="mt-3 text-center text-[#8fb79a]">
                    Get instant answers with source citations from the
                    transcript.
                    <br />
                    Works across the entire project too.
                  </p>

                  <div className="mt-10 space-y-4">
                    <Link
                      href={`/chat?projectId=${meeting.project.id}&meetingId=${meeting.id}`}
                      className="flex w-full items-center justify-between rounded-3xl border border-[#26a269]/20 bg-[#0d1808] px-6 py-6 text-left transition-all hover:border-[#69FF97]/30 hover:shadow-xl group"
                    >
                      <div>
                        <div className="font-medium text-[#d5f5dc]">
                          Chat about this meeting
                        </div>
                        <div className="text-xs text-[#70907a] mt-1">
                          Focused context • {meeting.title}
                        </div>
                      </div>
                      <div className="text-2xl text-[#69FF97] transition-transform group-hover:translate-x-1">
                        →
                      </div>
                    </Link>

                    <Link
                      href={`/chat?projectId=${meeting.project.id}`}
                      className="flex w-full items-center justify-between rounded-3xl border border-[#26a269]/20 bg-[#0d1808] px-6 py-6 text-left transition-all hover:border-[#69FF97]/30 hover:shadow-xl group"
                    >
                      <div>
                        <div className="font-medium text-[#d5f5dc]">
                          Chat about the whole project
                        </div>
                        <div className="text-xs text-[#70907a] mt-1">
                          Search every meeting in this project
                        </div>
                      </div>
                      <div className="text-2xl text-[#69FF97] transition-transform group-hover:translate-x-1">
                        →
                      </div>
                    </Link>
                  </div>

                  <div className="mt-8 text-center text-[10px] text-[#70907a] flex items-center justify-center gap-2">
                    <div className="h-px w-8 bg-[#26a269]/30"></div>
                    Powered by Gemini • Context-aware • Citations included
                    <div className="h-px w-8 bg-[#26a269]/30"></div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {/* ── Transcript panel (unchanged) ── */}
      <TranscriptPanel
        isOpen={transcriptOpen}
        onClose={() => setTranscriptOpen(false)}
        segments={transcriptSegments}
        highlightIds={highlightIds}
      />
    </>
  );
}
