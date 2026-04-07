"use client";
// components/SentimentDashboard.tsx
import { useState, useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { TrendingUp, Zap, X, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface SentimentRecord {
  id: string;
  speaker: string;
  sentimentScore: number;
  sentimentLabel: string;
  segment?: { text: string; startTime: string | null } | null;
}

interface Props {
  data: SentimentRecord[];
}

// ─── Modern Green Theme ─────────────────────────────────────────────────────
const SENTIMENT_CONFIG = {
  positive: {
    label: "Positive",
    emoji: "✅",
    bar: "#69FF97",
    bg: "bg-[#26a269]/10",
    border: "border-[#26a269]/30",
    text: "text-[#69FF97]",
    dot: "bg-[#69FF97]",
    timeline: "bg-[#69FF97]/90",
  },
  neutral: {
    label: "Neutral",
    emoji: "😐",
    bar: "#00E4FF",
    bg: "bg-[#00E4FF]/10",
    border: "border-[#00E4FF]/30",
    text: "text-[#00E4FF]",
    dot: "bg-[#00E4FF]",
    timeline: "bg-[#00E4FF]/90",
  },
  negative: {
    label: "Negative",
    emoji: "⚠️",
    bar: "#f59e0b",
    bg: "bg-amber-500/10",
    border: "border-amber-500/30",
    text: "text-amber-400",
    dot: "bg-amber-400",
    timeline: "bg-amber-400/90",
  },
  conflict: {
    label: "Conflict",
    emoji: "🔥",
    bar: "#ef4444",
    bg: "bg-red-500/10",
    border: "border-red-500/30",
    text: "text-red-400",
    dot: "bg-red-400",
    timeline: "bg-red-400/90",
  },
} as const;

type SentimentLabel = keyof typeof SENTIMENT_CONFIG;

// ─── Custom Recharts Tooltip ────────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  const score = Math.round(payload[0].value);
  const cfg =
    score >= 70
      ? SENTIMENT_CONFIG.positive
      : score >= 45
        ? SENTIMENT_CONFIG.neutral
        : score >= 25
          ? SENTIMENT_CONFIG.negative
          : SENTIMENT_CONFIG.conflict;

  return (
    <div className="bg-[#081004] border border-[#26a269]/30 rounded-2xl px-4 py-3 shadow-2xl backdrop-blur-xl">
      <p className="font-medium text-[#f6fff7]">{label}</p>
      <p className={cn("flex items-center gap-2 text-sm mt-1", cfg.text)}>
        <span className="text-xl">{cfg.emoji}</span>
        {cfg.label} • {score}/100
      </p>
    </div>
  );
};

// ─── Main Component ─────────────────────────────────────────────────────────
export default function SentimentDashboard({ data }: Props) {
  const [modalItem, setModalItem] = useState<SentimentRecord | null>(null);

  // Per-speaker averages
  const speakerAverages = useMemo(() => {
    const map: Record<
      string,
      { total: number; count: number; records: SentimentRecord[] }
    > = {};

    for (const item of data) {
      if (!map[item.speaker]) {
        map[item.speaker] = { total: 0, count: 0, records: [] };
      }
      map[item.speaker].total += item.sentimentScore;
      map[item.speaker].count += 1;
      map[item.speaker].records.push(item);
    }

    return Object.entries(map)
      .map(([speaker, v]) => ({
        speaker,
        avg: Math.round(v.total / v.count),
        records: v.records,
      }))
      .sort((a, b) => b.avg - a.avg);
  }, [data]);

  // Overall meeting sentiment
  const overallScore = useMemo(() => {
    if (!data.length) return 50;
    return Math.round(
      data.reduce((acc, item) => acc + item.sentimentScore, 0) / data.length,
    );
  }, [data]);

  const overallLabel: SentimentLabel =
    overallScore >= 70
      ? "positive"
      : overallScore >= 45
        ? "neutral"
        : overallScore >= 25
          ? "negative"
          : "conflict";

  const overallCfg = SENTIMENT_CONFIG[overallLabel];

  const getBarColor = (avg: number) => {
    if (avg >= 70) return SENTIMENT_CONFIG.positive.bar;
    if (avg >= 45) return SENTIMENT_CONFIG.neutral.bar;
    if (avg >= 25) return SENTIMENT_CONFIG.negative.bar;
    return SENTIMENT_CONFIG.conflict.bar;
  };

  if (data.length === 0) {
    return (
      <div className="rounded-3xl border border-[#26a269]/20 bg-[#081004]/70 p-12 text-center backdrop-blur-xl">
        <p className="text-[#8fb79a]">No sentiment data available yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Overall Sentiment Banner */}
      <div
        className={cn(
          "rounded-3xl border px-8 py-6 flex items-center gap-6 transition-all",
          overallCfg.bg,
          overallCfg.border,
        )}
      >
        <div className="text-5xl transition-transform hover:scale-110">
          {overallCfg.emoji}
        </div>
        <div className="flex-1">
          <div className="flex justify-between items-baseline mb-3">
            <span
              className={cn(
                "text-xl font-semibold tracking-tight",
                overallCfg.text,
              )}
            >
              Overall Meeting Vibe
            </span>
            <span
              className={cn("text-3xl font-bold tabular-nums", overallCfg.text)}
            >
              {overallScore}
              <span className="text-base font-medium opacity-70">/100</span>
            </span>
          </div>
          <div className="h-3 bg-[#0a1406] rounded-3xl overflow-hidden">
            <div
              className={cn(
                "h-full rounded-3xl transition-all duration-1000 ease-out",
                overallCfg.dot,
              )}
              style={{ width: `${overallScore}%` }}
            />
          </div>
          <p className={cn("text-sm mt-2", overallCfg.text)}>
            {overallCfg.label} • The team was mostly aligned and constructive
          </p>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Average Sentiment per Speaker - Bar Chart */}
        <div className="rounded-3xl border border-[#26a269]/20 bg-[#081004]/80 p-6 backdrop-blur-xl">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-[#f6fff7] mb-5">
            <TrendingUp size={16} className="text-[#69FF97]" />
            Average Sentiment by Speaker
          </h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart
              data={speakerAverages.map((s) => ({
                name: s.speaker,
                score: s.avg,
              }))}
              margin={{ top: 20, right: 10, left: -20, bottom: 10 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#26a26920" />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 12, fill: "#8fb79a" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                domain={[0, 100]}
                tick={{ fontSize: 11, fill: "#70907a" }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                content={<CustomTooltip />}
                cursor={{ fill: "#26a26910" }}
              />
              <Bar dataKey="score" radius={[8, 8, 0, 0]} maxBarSize={50}>
                {speakerAverages.map((s) => (
                  <Cell key={s.speaker} fill={getBarColor(s.avg)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Per-Speaker Breakdown */}
        <div className="rounded-3xl border border-[#26a269]/20 bg-[#081004]/80 p-6 backdrop-blur-xl">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-[#f6fff7] mb-5">
            <Zap size={16} className="text-[#00E4FF]" />
            Speaker Breakdown
          </h3>
          <div className="space-y-6">
            {speakerAverages.map(({ speaker, avg, records }) => {
              const cfg =
                avg >= 70
                  ? SENTIMENT_CONFIG.positive
                  : avg >= 45
                    ? SENTIMENT_CONFIG.neutral
                    : avg >= 25
                      ? SENTIMENT_CONFIG.negative
                      : SENTIMENT_CONFIG.conflict;

              return (
                <div key={speaker} className="flex items-center gap-4 group">
                  <div
                    className={cn(
                      "w-9 h-9 rounded-2xl flex items-center justify-center text-lg font-bold flex-shrink-0 transition-transform group-hover:scale-110",
                      cfg.bg,
                      cfg.border,
                      cfg.text,
                    )}
                  >
                    {speaker[0]?.toUpperCase() ?? "?"}
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between text-sm mb-1.5">
                      <span className="font-medium text-[#d5f5dc]">
                        {speaker}
                      </span>
                      <span className="tabular-nums font-semibold text-[#f6fff7]">
                        {avg}/100
                      </span>
                    </div>
                    <div className="h-2 bg-[#0a1406] rounded-3xl overflow-hidden">
                      <div
                        className={cn(
                          "h-full rounded-3xl transition-all",
                          cfg.dot,
                        )}
                        style={{ width: `${avg}%` }}
                      />
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xl">{cfg.emoji}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Sentiment Timeline */}
      <div className="rounded-3xl border border-[#26a269]/20 bg-[#081004]/80 p-6 backdrop-blur-xl">
        <div className="flex items-center gap-2 mb-2">
          <Clock size={16} className="text-[#00E4FF]" />
          <h3 className="text-sm font-semibold text-[#f6fff7]">
            Sentiment Over Time
          </h3>
        </div>
        <p className="text-xs text-[#70907a] mb-6">
          Click any block to see the original quote • Early · Mid · Late
        </p>

        <div className="space-y-5">
          {speakerAverages.map(({ speaker, records }) => {
            // Simple early/mid/late distribution (you can improve this later with real timestamps)
            const chunks = [...records];
            const early = chunks[0];
            const mid = chunks[Math.floor(chunks.length / 2)] || early;
            const late = chunks[chunks.length - 1] || mid;

            const timeSegments = [
              { period: "early", record: early },
              { period: "mid", record: mid },
              { period: "late", record: late },
            ];

            return (
              <div key={speaker} className="flex items-center gap-4">
                <span className="w-24 text-sm font-medium text-[#8fb79a] truncate">
                  {speaker}
                </span>

                <div className="flex-1 flex gap-2">
                  {timeSegments.map(({ period, record }) => {
                    if (!record) {
                      return (
                        <div
                          key={period}
                          className="flex-1 h-10 rounded-2xl bg-[#0a1406] border border-[#26a269]/10"
                        />
                      );
                    }

                    const cfg =
                      SENTIMENT_CONFIG[
                        record.sentimentLabel as SentimentLabel
                      ] ?? SENTIMENT_CONFIG.neutral;

                    return (
                      <button
                        key={period}
                        onClick={() => setModalItem(record)}
                        className={cn(
                          "flex-1 h-10 rounded-2xl border flex items-center justify-center text-2xl transition-all hover:scale-105 hover:shadow-md",
                          cfg.timeline,
                          cfg.border,
                        )}
                        title={`${period.toUpperCase()} • ${record.sentimentLabel} (${record.sentimentScore})`}
                      >
                        {cfg.emoji}
                      </button>
                    );
                  })}
                </div>

                <div className="text-right w-10">
                  <span className="text-xs text-[#70907a]">avg</span>
                  <span className="block text-lg font-semibold text-[#f6fff7]">
                    {Math.round(
                      records.reduce((a, b) => a + b.sentimentScore, 0) /
                        records.length,
                    )}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Quote Modal */}
      {modalItem && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-xl z-50 flex items-center justify-center p-4"
          onClick={() => setModalItem(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-[#081004] border border-[#26a269]/30 rounded-3xl max-w-lg w-full p-8 shadow-2xl"
          >
            <div className="flex justify-between items-start mb-6">
              <div className="flex items-center gap-3">
                <span className="text-2xl">
                  {SENTIMENT_CONFIG[modalItem.sentimentLabel as SentimentLabel]
                    ?.emoji ?? "😐"}
                </span>
                <div>
                  <p className="font-semibold text-[#f6fff7]">
                    {modalItem.speaker}
                  </p>
                  <p className="text-xs text-[#69FF97]">
                    {modalItem.sentimentLabel} • {modalItem.sentimentScore}/100
                  </p>
                </div>
              </div>
              <button
                onClick={() => setModalItem(null)}
                className="text-[#8fb79a] hover:text-[#69FF97] transition-colors"
              >
                <X size={22} />
              </button>
            </div>

            <blockquote className="text-[#d5f5dc] text-[15px] leading-relaxed italic border-l-4 border-[#69FF97] pl-4 py-1">
              {modalItem.segment?.text ??
                "No quote available for this segment."}
            </blockquote>

            {modalItem.segment?.startTime && (
              <p className="mt-6 text-xs text-[#70907a] flex items-center gap-1.5">
                <Clock size={13} />
                Timestamp: {modalItem.segment.startTime}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
