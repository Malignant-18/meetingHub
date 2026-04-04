"use client";
// components/SentimentDashboard.tsx
// Full sentiment visualization:
//   - Overall sentiment score bar
//   - Per-speaker sentiment breakdown with emoji indicators
//   - Color-coded timeline (early/mid/late per speaker)
//   - Recharts bar chart of average scores per speaker
//   - Click any timeline segment to see the original quote in a modal

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
import { X, TrendingUp, TrendingDown, Minus, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ──────────────────────────────────────────────────────────────────
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

// ─── Config ──────────────────────────────────────────────────────────────────
const SENTIMENT_CONFIG = {
  positive: {
    label: "Positive",
    emoji: "✅",
    bar: "#10b981",
    bg: "bg-emerald-900/40",
    border: "border-emerald-700/50",
    text: "text-emerald-300",
    dot: "bg-emerald-500",
    timelineBg: "bg-emerald-600",
  },
  neutral: {
    label: "Neutral",
    emoji: "😐",
    bar: "#6366f1",
    bg: "bg-indigo-900/40",
    border: "border-indigo-700/50",
    text: "text-indigo-300",
    dot: "bg-indigo-500",
    timelineBg: "bg-indigo-600",
  },
  negative: {
    label: "Negative",
    emoji: "⚠️",
    bar: "#f59e0b",
    bg: "bg-amber-900/40",
    border: "border-amber-700/50",
    text: "text-amber-300",
    dot: "bg-amber-500",
    timelineBg: "bg-amber-500",
  },
  conflict: {
    label: "Conflict",
    emoji: "🔥",
    bar: "#ef4444",
    bg: "bg-red-900/40",
    border: "border-red-700/50",
    text: "text-red-300",
    dot: "bg-red-500",
    timelineBg: "bg-red-600",
  },
} as const;

type SentimentLabel = keyof typeof SENTIMENT_CONFIG;

const TIME_ORDER = ["early", "mid", "late"];

// ─── Custom Tooltip for Recharts ─────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  const score = Math.round(payload[0].value);
  const sentiment =
    score >= 70
      ? "positive"
      : score >= 45
        ? "neutral"
        : score >= 25
          ? "negative"
          : "conflict";
  const cfg = SENTIMENT_CONFIG[sentiment];
  return (
    <div className="bg-[#1e1c32] border border-slate-600 rounded-xl px-3 py-2 text-sm shadow-xl">
      <p className="text-white font-medium">{label}</p>
      <p className={cn("text-xs mt-0.5", cfg.text)}>
        {cfg.emoji} {cfg.label} · Score: {score}/100
      </p>
    </div>
  );
};

// ─── Main component ──────────────────────────────────────────────────────────
export default function SentimentDashboard({ data }: Props) {
  const [modalItem, setModalItem] = useState<SentimentRecord | null>(null);

  // ── Derive per-speaker averages ────────────────────────────────────────────
  const speakerAverages = useMemo(() => {
    const map: Record<
      string,
      { total: number; count: number; records: SentimentRecord[] }
    > = {};
    for (const item of data) {
      if (!map[item.speaker])
        map[item.speaker] = { total: 0, count: 0, records: [] };
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

  // ── Overall meeting sentiment ──────────────────────────────────────────────
  const overallScore = useMemo(() => {
    if (!data.length) return 50;
    return Math.round(
      data.reduce((s, d) => s + d.sentimentScore, 0) / data.length,
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

  // ── Bar chart color per speaker ───────────────────────────────────────────
  const getBarColor = (avg: number) => {
    if (avg >= 70) return SENTIMENT_CONFIG.positive.bar;
    if (avg >= 45) return SENTIMENT_CONFIG.neutral.bar;
    if (avg >= 25) return SENTIMENT_CONFIG.negative.bar;
    return SENTIMENT_CONFIG.conflict.bar;
  };

  if (data.length === 0) {
    return (
      <div className="bg-[#1e1c32] border border-slate-700/50 rounded-2xl p-8 text-center">
        <p className="text-slate-400 text-sm">No sentiment data available.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* ── Overall sentiment banner ─────────────────────────────────────── */}
      <div
        className={cn(
          "flex items-center gap-4 rounded-2xl px-5 py-4 border",
          overallCfg.bg,
          overallCfg.border,
        )}
      >
        <span className="text-3xl" role="img">
          {overallCfg.emoji}
        </span>
        <div className="flex-1">
          <div className="flex items-center justify-between mb-1.5">
            <span className={cn("text-sm font-semibold", overallCfg.text)}>
              Overall meeting sentiment — {overallCfg.label}
            </span>
            <span
              className={cn("text-sm font-bold tabular-nums", overallCfg.text)}
            >
              {overallScore}/100
            </span>
          </div>
          {/* Score bar */}
          <div className="h-2 bg-slate-700/60 rounded-full overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-700",
                overallCfg.dot,
              )}
              style={{ width: `${overallScore}%` }}
            />
          </div>
        </div>
      </div>

      {/* ── Two-column layout ──────────────────────────────────────────────── */}
      <div className="grid lg:grid-cols-2 gap-5">
        {/* Left — Recharts bar chart ──────────────────────────────────────── */}
        <div className="bg-[#1e1c32] border border-slate-700/50 rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            <TrendingUp size={14} className="text-indigo-400" />
            Average sentiment per speaker
          </h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart
              data={speakerAverages.map((s) => ({
                name: s.speaker,
                score: s.avg,
              }))}
              margin={{ top: 0, right: 8, left: -20, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#2d2a4a" />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 11, fill: "#94a3b8" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                domain={[0, 100]}
                tick={{ fontSize: 10, fill: "#475569" }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                content={<CustomTooltip />}
                cursor={{ fill: "rgba(99,102,241,0.08)" }}
              />
              <Bar dataKey="score" radius={[6, 6, 0, 0]} maxBarSize={48}>
                {speakerAverages.map((s) => (
                  <Cell key={s.speaker} fill={getBarColor(s.avg)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Right — Per-speaker breakdown ──────────────────────────────────── */}
        <div className="bg-[#1e1c32] border border-slate-700/50 rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            <Zap size={14} className="text-purple-400" />
            Speaker breakdown
          </h3>
          <div className="space-y-3">
            {speakerAverages.map(({ speaker, avg, records }) => {
              const label: SentimentLabel =
                avg >= 70
                  ? "positive"
                  : avg >= 45
                    ? "neutral"
                    : avg >= 25
                      ? "negative"
                      : "conflict";
              const cfg = SENTIMENT_CONFIG[label];
              const dominantLabel = records.reduce<Record<string, number>>(
                (acc, r) => {
                  acc[r.sentimentLabel] = (acc[r.sentimentLabel] ?? 0) + 1;
                  return acc;
                },
                {},
              );
              const topLabel =
                Object.entries(dominantLabel).sort(
                  (a, b) => b[1] - a[1],
                )[0]?.[0] ?? "neutral";
              const topCfg =
                SENTIMENT_CONFIG[topLabel as SentimentLabel] ??
                SENTIMENT_CONFIG.neutral;

              return (
                <div key={speaker} className="flex items-center gap-3">
                  {/* Avatar */}
                  <div
                    className={cn(
                      "w-8 h-8 rounded-full border flex items-center justify-center text-xs font-bold flex-shrink-0",
                      topCfg.bg,
                      topCfg.border,
                      topCfg.text,
                    )}
                  >
                    {speaker[0]?.toUpperCase() ?? "?"}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-white truncate">
                        {speaker}
                      </span>
                      <span className="text-xs text-slate-400 tabular-nums ml-2">
                        {avg}/100
                      </span>
                    </div>
                    {/* Mini score bar */}
                    <div className="h-1.5 bg-slate-700/60 rounded-full overflow-hidden">
                      <div
                        className={cn("h-full rounded-full", cfg.dot)}
                        style={{ width: `${avg}%` }}
                      />
                    </div>
                  </div>

                  {/* Emoji + label */}
                  <span className="text-xs flex-shrink-0 flex items-center gap-1">
                    <span>{topCfg.emoji}</span>
                    <span className={cn("hidden sm:block", topCfg.text)}>
                      {topCfg.label}
                    </span>
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Color-coded timeline per speaker ──────────────────────────────── */}
      <div className="bg-[#1e1c32] border border-slate-700/50 rounded-2xl p-5">
        <h3 className="text-sm font-semibold text-white mb-1 flex items-center gap-2">
          <TrendingDown size={14} className="text-slate-400" />
          Sentiment over time
        </h3>
        <p className="text-xs text-slate-500 mb-4">
          Click any segment to see the original quote. Early · Mid · Late
        </p>

        <div className="space-y-3">
          {speakerAverages.map(({ speaker, records }) => {
            // Build time map: { early: record, mid: record, late: record }
            const timeMap: Record<string, SentimentRecord | undefined> = {};
            for (const r of records) {
              // sentimentLabel stored in DB, check the segment's time via position
              // We stored time_label indirectly — use the record order as proxy
              if (!timeMap["early"]) {
                timeMap["early"] = r;
                continue;
              }
              if (!timeMap["mid"]) {
                timeMap["mid"] = r;
                continue;
              }
              if (!timeMap["late"]) {
                timeMap["late"] = r;
                continue;
              }
            }
            // Fill remaining slots by cycling
            if (!timeMap["mid"]) timeMap["mid"] = timeMap["early"];
            if (!timeMap["late"]) timeMap["late"] = timeMap["mid"];

            return (
              <div key={speaker} className="flex items-center gap-3">
                <span className="text-xs text-slate-400 w-24 truncate flex-shrink-0">
                  {speaker}
                </span>
                <div className="flex gap-1.5 flex-1">
                  {TIME_ORDER.map((period) => {
                    const record = timeMap[period];
                    if (!record) {
                      return (
                        <div
                          key={period}
                          className="flex-1 h-8 rounded-lg bg-slate-800/50 border border-slate-700/30"
                        />
                      );
                    }
                    const label = record.sentimentLabel as SentimentLabel;
                    const cfg =
                      SENTIMENT_CONFIG[label] ?? SENTIMENT_CONFIG.neutral;
                    return (
                      <button
                        key={period}
                        onClick={() => setModalItem(record)}
                        title={`${period} — ${cfg.label} (${record.sentimentScore}/100)`}
                        className={cn(
                          "flex-1 h-8 rounded-lg border transition-all hover:scale-105 hover:brightness-110 cursor-pointer",
                          "flex items-center justify-center text-xs",
                          cfg.timelineBg,
                          cfg.border,
                        )}
                      >
                        <span className="opacity-80">{cfg.emoji}</span>
                      </button>
                    );
                  })}
                </div>
                <span className="text-xs text-slate-600 w-8 tabular-nums text-right flex-shrink-0">
                  {Math.round(
                    records.reduce((s, r) => s + r.sentimentScore, 0) /
                      records.length,
                  )}
                </span>
              </div>
            );
          })}
        </div>

        {/* Timeline legend */}
        <div className="flex items-center gap-4 mt-4 pt-4 border-t border-slate-700/30">
          {Object.entries(SENTIMENT_CONFIG).map(([key, cfg]) => (
            <div key={key} className="flex items-center gap-1.5">
              <span
                className={cn(
                  "w-2.5 h-2.5 rounded-sm flex-shrink-0",
                  cfg.timelineBg,
                )}
              />
              <span className="text-xs text-slate-500">
                {cfg.emoji} {cfg.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Quote modal ───────────────────────────────────────────────────── */}
      {modalItem && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setModalItem(null)}
        >
          <div
            className="bg-[#1e1c32] border border-slate-600 rounded-2xl p-6 max-w-md w-full shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  {(() => {
                    const label = modalItem.sentimentLabel as SentimentLabel;
                    const cfg =
                      SENTIMENT_CONFIG[label] ?? SENTIMENT_CONFIG.neutral;
                    return (
                      <>
                        <span
                          className={cn(
                            "text-xs font-semibold uppercase tracking-wider",
                            cfg.text,
                          )}
                        >
                          {modalItem.speaker}
                        </span>
                        <span
                          className={cn(
                            "text-xs px-2 py-0.5 rounded-full border",
                            cfg.bg,
                            cfg.border,
                            cfg.text,
                          )}
                        >
                          {cfg.emoji} {cfg.label}
                        </span>
                        <span className="text-xs text-slate-500">
                          Score: {modalItem.sentimentScore}/100
                        </span>
                      </>
                    );
                  })()}
                </div>
              </div>
              <button
                onClick={() => setModalItem(null)}
                className="text-slate-500 hover:text-white transition-colors p-1"
              >
                <X size={16} />
              </button>
            </div>

            <blockquote className="text-slate-200 text-sm leading-relaxed border-l-2 border-indigo-600 pl-4 italic">
              {modalItem.segment?.text ??
                "No direct quote available for this segment."}
            </blockquote>

            {modalItem.segment?.startTime && (
              <p className="text-xs text-slate-500 mt-3">
                Timestamp: {modalItem.segment.startTime}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
