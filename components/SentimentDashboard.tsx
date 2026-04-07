"use client";

import { useMemo, useState, type ComponentType } from "react";
import {
  AlertOctagon,
  BarChart3,
  CheckCircle2,
  Clock,
  MinusCircle,
  TriangleAlert,
  Waves,
  X,
} from "lucide-react";
import {
  BarChart,
  Bar,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
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
  onSpeakerSelect?: (speaker: string) => void;
}

type SentimentLabel = "positive" | "neutral" | "negative" | "conflict";

const SENTIMENT_CONFIG: Record<
  SentimentLabel,
  {
    label: string;
    shortLabel: string;
    bar: string;
    bg: string;
    border: string;
    text: string;
    dot: string;
    timeline: string;
    icon: ComponentType<{ size?: number; className?: string }>;
    summary: string;
  }
> = {
  positive: {
    label: "Positive",
    shortLabel: "Positive",
    bar: "#69FF97",
    bg: "bg-[#26a269]/10",
    border: "border-[#26a269]/30",
    text: "text-[#69FF97]",
    dot: "bg-[#69FF97]",
    timeline: "bg-[#69FF97]/85",
    icon: CheckCircle2,
    summary: "Constructive, aligned, solution-focused",
  },
  neutral: {
    label: "Neutral",
    shortLabel: "Neutral",
    bar: "#00E4FF",
    bg: "bg-[#00E4FF]/10",
    border: "border-[#00E4FF]/30",
    text: "text-[#00E4FF]",
    dot: "bg-[#00E4FF]",
    timeline: "bg-[#00E4FF]/85",
    icon: MinusCircle,
    summary: "Balanced, factual, low emotional load",
  },
  negative: {
    label: "Negative",
    shortLabel: "Concern",
    bar: "#f59e0b",
    bg: "bg-amber-500/10",
    border: "border-amber-500/30",
    text: "text-amber-400",
    dot: "bg-amber-400",
    timeline: "bg-amber-400/85",
    icon: TriangleAlert,
    summary: "Friction, hesitation, unresolved concerns",
  },
  conflict: {
    label: "Conflict",
    shortLabel: "Conflict",
    bar: "#ef4444",
    bg: "bg-red-500/10",
    border: "border-red-500/30",
    text: "text-red-400",
    dot: "bg-red-400",
    timeline: "bg-red-400/85",
    icon: AlertOctagon,
    summary: "Direct disagreement, pushback, tension",
  },
};

function getLabelFromScore(score: number): SentimentLabel {
  if (score >= 70) return "positive";
  if (score >= 45) return "neutral";
  if (score >= 25) return "negative";
  return "conflict";
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;

  const score = Math.round(payload[0].value);
  const sentiment = getLabelFromScore(score);
  const cfg = SENTIMENT_CONFIG[sentiment];
  const Icon = cfg.icon;

  return (
    <div className="rounded-2xl border border-[#26a269]/20 bg-[#081004]/95 px-4 py-3 shadow-2xl backdrop-blur-xl">
      <p className="font-medium text-[#f6fff7]">{label}</p>
      <div className={cn("mt-2 flex items-center gap-2 text-sm", cfg.text)}>
        <Icon size={14} />
        <span>
          {cfg.label} · {score}/100
        </span>
      </div>
    </div>
  );
};

export default function SentimentDashboard({ data, onSpeakerSelect }: Props) {
  const [modalItem, setModalItem] = useState<SentimentRecord | null>(null);

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
      .map(([speaker, value]) => {
        const avg = Math.round(value.total / value.count);
        const min = Math.min(
          ...value.records.map((record) => record.sentimentScore),
        );
        const max = Math.max(
          ...value.records.map((record) => record.sentimentScore),
        );

        return {
          speaker,
          avg,
          records: value.records,
          spread: max - min,
          label: getLabelFromScore(avg),
        };
      })
      .sort((a, b) => b.avg - a.avg);
  }, [data]);

  const overallScore = useMemo(() => {
    if (!data.length) return 50;
    return Math.round(
      data.reduce((sum, item) => sum + item.sentimentScore, 0) / data.length,
    );
  }, [data]);

  const overallLabel = getLabelFromScore(overallScore);
  const overallCfg = SENTIMENT_CONFIG[overallLabel];
  const OverallIcon = overallCfg.icon;

  const sentimentCounts = useMemo(() => {
    const counts: Record<SentimentLabel, number> = {
      positive: 0,
      neutral: 0,
      negative: 0,
      conflict: 0,
    };

    for (const item of data) {
      const label =
        item.sentimentLabel in SENTIMENT_CONFIG
          ? (item.sentimentLabel as SentimentLabel)
          : getLabelFromScore(item.sentimentScore);
      counts[label] += 1;
    }

    return counts;
  }, [data]);

  const totalRecords = data.length;
  const strongestAlignment = speakerAverages[0] ?? null;
  const highestConcern =
    [...speakerAverages].sort((a, b) => a.avg - b.avg)[0] ?? null;
  const mostVolatile =
    [...speakerAverages].sort((a, b) => b.spread - a.spread)[0] ?? null;

  if (data.length === 0) {
    return (
      <div className="rounded-3xl border border-[#26a269]/20 bg-[#081004]/70 p-12 text-center backdrop-blur-xl">
        <p className="text-[#8fb79a]">No sentiment data available yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 xl:grid-cols-[1.35fr_0.65fr]">
        <div
          className={cn(
            "rounded-[28px] border px-6 py-6 shadow-[0_18px_48px_rgba(0,0,0,0.2)]",
            overallCfg.bg,
            overallCfg.border,
          )}
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-[#8fb79a]">
                Overall Sentiment
              </p>
              <div className="mt-3 flex items-center gap-3">
                <div
                  className={cn(
                    "flex h-12 w-12 items-center justify-center rounded-2xl border",
                    overallCfg.bg,
                    overallCfg.border,
                    overallCfg.text,
                  )}
                >
                  <OverallIcon size={22} />
                </div>
                <div>
                  <h3 className={cn("text-2xl font-semibold", overallCfg.text)}>
                    {overallCfg.label}
                  </h3>
                  <p className="mt-1 text-sm text-[#8fb79a]">
                    {overallCfg.summary}
                  </p>
                </div>
              </div>
            </div>

            <div className="text-right">
              <p className="text-xs uppercase tracking-[0.14em] text-[#70907a]">
                Score
              </p>
              <p className={cn("mt-2 text-4xl font-semibold", overallCfg.text)}>
                {overallScore}
                <span className="ml-1 text-base font-medium opacity-70">
                  /100
                </span>
              </p>
            </div>
          </div>

          <div className="mt-6">
            <div className="h-3 overflow-hidden rounded-full bg-[#0a1406]">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-700",
                  overallCfg.dot,
                )}
                style={{ width: `${overallScore}%` }}
              />
            </div>
            <div className="mt-3 flex items-center justify-between text-[11px] text-[#70907a]">
              <span>Conflict</span>
              <span>Negative</span>
              <span>Neutral</span>
              <span>Positive</span>
            </div>
          </div>
        </div>

        <div className="rounded-[28px] border border-[#26a269]/20 bg-[#081004]/80 p-5 shadow-[0_18px_48px_rgba(0,0,0,0.2)] backdrop-blur-xl">
          <div className="mb-4 flex items-center gap-2">
            <Waves size={16} className="text-[#00E4FF]" />
            <h3 className="text-sm font-semibold text-[#f6fff7]">Legend</h3>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {(
              Object.entries(SENTIMENT_CONFIG) as [
                SentimentLabel,
                (typeof SENTIMENT_CONFIG)[SentimentLabel],
              ][]
            ).map(([key, cfg]) => {
              const Icon = cfg.icon;
              return (
                <div
                  key={key}
                  className="flex items-start gap-3 rounded-2xl border border-[#26a269]/20 bg-[#0b1507] px-3 py-3"
                >
                  <div
                    className={cn(
                      "mt-0.5 flex h-8 w-8 items-center justify-center rounded-xl border",
                      cfg.bg,
                      cfg.border,
                      cfg.text,
                    )}
                  >
                    <Icon size={15} />
                  </div>
                  <div className="pt-1">
                    <p className={cn("text-base font-medium", cfg.text)}>
                      {cfg.label}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-[28px] border border-[#26a269]/20 bg-[#081004]/80 p-6 backdrop-blur-xl">
          <div className="mb-5 flex items-center gap-2">
            <BarChart3 size={16} className="text-[#69FF97]" />
            <h3 className="text-sm font-semibold text-[#f6fff7]">
              Average Sentiment by Speaker
            </h3>
          </div>

          <ResponsiveContainer width="100%" height={260}>
            <BarChart
              data={speakerAverages.map((item) => ({
                name: item.speaker,
                score: item.avg,
              }))}
              margin={{ top: 10, right: 10, left: -18, bottom: 4 }}
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
              <Bar dataKey="score" radius={[8, 8, 0, 0]} maxBarSize={54}>
                {speakerAverages.map((item) => (
                  <Cell
                    key={item.speaker}
                    fill={SENTIMENT_CONFIG[getLabelFromScore(item.avg)].bar}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-[28px] border border-[#26a269]/20 bg-[#081004]/80 p-6 backdrop-blur-xl">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-[#f6fff7]">
                Segment Distribution
              </h3>
              <p className="mt-1 text-xs text-[#70907a]">
                Share of analyzed transcript segments by tone category
              </p>
            </div>
            <span className="text-xs text-[#8fb79a]">
              {totalRecords} segments
            </span>
          </div>

          <div className="overflow-hidden rounded-full bg-[#0a1406]">
            <div className="flex h-4 w-full">
              {(
                Object.entries(sentimentCounts) as [SentimentLabel, number][]
              ).map(([label, value]) => (
                <div
                  key={label}
                  className={cn("h-full", SENTIMENT_CONFIG[label].dot)}
                  style={{
                    width: `${totalRecords ? (value / totalRecords) * 100 : 0}%`,
                  }}
                />
              ))}
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3">
            {(
              Object.entries(sentimentCounts) as [SentimentLabel, number][]
            ).map(([label, value]) => {
              const cfg = SENTIMENT_CONFIG[label];
              const Icon = cfg.icon;
              return (
                <div
                  key={label}
                  className="rounded-2xl border border-[#26a269]/20 bg-[#0b1507] px-4 py-3"
                >
                  <div className="flex items-center gap-2">
                    <Icon size={14} className={cfg.text} />
                    <span className="text-sm font-medium text-[#d5f5dc]">
                      {cfg.shortLabel}
                    </span>
                  </div>
                  <p className="mt-2 text-2xl font-semibold text-[#f6fff7]">
                    {value}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <div className="rounded-[28px] border border-[#26a269]/20 bg-[#081004]/80 p-6 backdrop-blur-xl">
          <div className="mb-5 flex items-center gap-2">
            <CheckCircle2 size={16} className="text-[#00E4FF]" />
            <h3 className="text-sm font-semibold text-[#f6fff7]">
              Speaker Activity
            </h3>
          </div>

          <div className="space-y-4">
            {speakerAverages.map(({ speaker, avg, records }) => {
              const cfg = SENTIMENT_CONFIG[getLabelFromScore(avg)];
              const Icon = cfg.icon;

              return (
                <button
                  key={speaker}
                  type="button"
                  onClick={() => onSpeakerSelect?.(speaker)}
                  className="group flex w-full items-center gap-4 rounded-2xl border border-[#26a269]/10 bg-[#0b1507] px-4 py-4 text-left transition-colors hover:border-[#26a269]/24"
                >
                  <div
                    className={cn(
                      "flex h-11 w-11 items-center justify-center rounded-2xl border",
                      cfg.bg,
                      cfg.border,
                      cfg.text,
                    )}
                  >
                    <Icon size={18} />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-3">
                      <span className="truncate text-sm font-medium text-[#f6fff7]">
                        {speaker}
                      </span>
                      <span className="text-sm font-semibold text-[#d5f5dc]">
                        {avg}/100
                      </span>
                    </div>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#081004]">
                      <div
                        className={cn("h-full rounded-full", cfg.dot)}
                        style={{ width: `${avg}%` }}
                      />
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="rounded-[28px] border border-[#26a269]/20 bg-[#081004]/80 p-6 backdrop-blur-xl">
          <div className="mb-2 flex items-center gap-2">
            <Clock size={16} className="text-[#00E4FF]" />
            <h3 className="text-sm font-semibold text-[#f6fff7]">
              Sentiment Over Time
            </h3>
          </div>
          <p className="mb-5 text-xs text-[#70907a]">
            Click a block to inspect the underlying quote. The three columns
            track early, middle, and late parts of the meeting.
          </p>

          <div className="space-y-5">
            {speakerAverages.map(({ speaker, records }) => {
              const early = records[0];
              const mid = records[Math.floor(records.length / 2)] ?? early;
              const late = records[records.length - 1] ?? mid;

              const timeSegments = [
                { period: "Early", record: early },
                { period: "Mid", record: mid },
                { period: "Late", record: late },
              ];

              return (
                <div
                  key={speaker}
                  className="grid grid-cols-[92px_1fr_44px] items-center gap-3"
                >
                  <span className="truncate text-sm font-medium text-[#8fb79a]">
                    {speaker}
                  </span>

                  <div className="flex gap-2">
                    {timeSegments.map(({ period, record }) => {
                      if (!record) {
                        return (
                          <div
                            key={period}
                            className="h-11 flex-1 rounded-2xl border border-[#26a269]/10 bg-[#0a1406]"
                          />
                        );
                      }

                      const label =
                        record.sentimentLabel in SENTIMENT_CONFIG
                          ? (record.sentimentLabel as SentimentLabel)
                          : getLabelFromScore(record.sentimentScore);
                      const cfg = SENTIMENT_CONFIG[label];
                      const Icon = cfg.icon;

                      return (
                        <button
                          key={period}
                          type="button"
                          onClick={() => setModalItem(record)}
                          title={`${period} · ${cfg.label} · ${record.sentimentScore}/100`}
                          className={cn(
                            "flex h-11 flex-1 items-center justify-center rounded-2xl border transition-transform hover:scale-[1.02]",
                            cfg.timeline,
                            cfg.border,
                          )}
                        >
                          <Icon size={16} className="text-[#041102]" />
                        </button>
                      );
                    })}
                  </div>

                  <span className="text-right text-sm font-semibold text-[#f6fff7]">
                    {Math.round(
                      records.reduce(
                        (sum, record) => sum + record.sentimentScore,
                        0,
                      ) / records.length,
                    )}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {modalItem && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xl"
          onClick={() => setModalItem(null)}
        >
          <div
            onClick={(event) => event.stopPropagation()}
            className="w-full max-w-lg rounded-[28px] border border-[#26a269]/22 bg-[#081004] p-8 shadow-2xl"
          >
            <div className="mb-6 flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                {(() => {
                  const label =
                    modalItem.sentimentLabel in SENTIMENT_CONFIG
                      ? (modalItem.sentimentLabel as SentimentLabel)
                      : getLabelFromScore(modalItem.sentimentScore);
                  const cfg = SENTIMENT_CONFIG[label];
                  const Icon = cfg.icon;

                  return (
                    <>
                      <div
                        className={cn(
                          "flex h-11 w-11 items-center justify-center rounded-2xl border",
                          cfg.bg,
                          cfg.border,
                          cfg.text,
                        )}
                      >
                        <Icon size={18} />
                      </div>
                      <div>
                        <p className="font-semibold text-[#f6fff7]">
                          {modalItem.speaker}
                        </p>
                        <p className={cn("mt-1 text-xs", cfg.text)}>
                          {cfg.label} · {modalItem.sentimentScore}/100
                        </p>
                      </div>
                    </>
                  );
                })()}
              </div>

              <button
                type="button"
                onClick={() => setModalItem(null)}
                className="text-[#8fb79a] transition-colors hover:text-[#69FF97]"
              >
                <X size={20} />
              </button>
            </div>

            <blockquote className="border-l-4 border-[#69FF97] pl-4 text-[15px] italic leading-relaxed text-[#d5f5dc]">
              {modalItem.segment?.text ??
                "No quote available for this segment."}
            </blockquote>

            {modalItem.segment?.startTime && (
              <p className="mt-6 flex items-center gap-1.5 text-xs text-[#70907a]">
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
