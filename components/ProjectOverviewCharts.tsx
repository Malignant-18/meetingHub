"use client";
// components/ProjectOverviewCharts.tsx

import {
  BarChart,
  Bar,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  LineChart,
  Line,
} from "recharts";

type MeetingChartPoint = {
  name: string;
  segments: number;
  actions: number;
  decisions: number;
};

const TooltipStyle = {
  background: "#081004",
  border: "1px solid rgba(38,162,105,0.20)",
  borderRadius: 14,
  color: "#f6fff7",
  fontSize: 12,
  padding: "8px 12px",
};

export default function ProjectOverviewCharts({
  meetingData,
}: {
  meetingData: MeetingChartPoint[];
}) {
  if (meetingData.length === 0) return null;

  const cumulative = meetingData.map((m, i) => ({
    ...m,
    cumDecisions: meetingData
      .slice(0, i + 1)
      .reduce((s, item) => s + item.decisions, 0),
  }));

  return (
    <div className="grid gap-5 xl:grid-cols-2">
      {/* Bar — activity per meeting */}
      <div className="rounded-[28px] border border-[#26a269]/20 bg-[#081004]/80 p-5 shadow-[0_16px_40px_rgba(0,0,0,0.20)] backdrop-blur-xl">
        <h3 className="text-base font-semibold text-[#f6fff7]">
          Meeting activity
        </h3>
        <p className="mt-0.5 text-xs text-[#8fb79a]">
          Segments, action items, and decisions per meeting
        </p>
        <div className="mt-5 h-[240px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={meetingData} barGap={4} barCategoryGap="30%">
              <CartesianGrid
                stroke="rgba(38,162,105,0.10)"
                vertical={false}
                strokeDasharray="3 3"
              />
              <XAxis
                dataKey="name"
                stroke="#70907a"
                tickLine={false}
                axisLine={false}
                fontSize={11}
              />
              <YAxis
                stroke="#70907a"
                tickLine={false}
                axisLine={false}
                fontSize={11}
              />
              <Tooltip
                cursor={{ fill: "rgba(38,162,105,0.06)" }}
                contentStyle={TooltipStyle}
              />
              <Bar
                dataKey="segments"
                name="Segments"
                fill="#00E4FF"
                radius={[6, 6, 0, 0]}
              />
              <Bar
                dataKey="actions"
                name="Actions"
                fill="#69FF97"
                radius={[6, 6, 0, 0]}
              />
              <Bar
                dataKey="decisions"
                name="Decisions"
                fill="#26a269"
                radius={[6, 6, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
        {/* Legend */}
        <div className="mt-3 flex items-center gap-5 text-[11px] text-[#70907a]">
          {[
            { color: "#00E4FF", label: "Segments" },
            { color: "#69FF97", label: "Actions" },
            { color: "#26a269", label: "Decisions" },
          ].map((l) => (
            <div key={l.label} className="flex items-center gap-1.5">
              <span
                className="h-2 w-2 rounded-full"
                style={{ background: l.color }}
              />
              {l.label}
            </div>
          ))}
        </div>
      </div>

      {/* Line — cumulative decisions */}
      <div className="rounded-[28px] border border-[#26a269]/20 bg-[#081004]/80 p-5 shadow-[0_16px_40px_rgba(0,0,0,0.20)] backdrop-blur-xl">
        <h3 className="text-base font-semibold text-[#f6fff7]">
          Decisions over time
        </h3>
        <p className="mt-0.5 text-xs text-[#8fb79a]">
          Cumulative decisions as meetings stack up
        </p>
        <div className="mt-5 h-[240px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={cumulative}>
              <CartesianGrid
                stroke="rgba(38,162,105,0.10)"
                vertical={false}
                strokeDasharray="3 3"
              />
              <XAxis
                dataKey="name"
                stroke="#70907a"
                tickLine={false}
                axisLine={false}
                fontSize={11}
              />
              <YAxis
                stroke="#70907a"
                tickLine={false}
                axisLine={false}
                fontSize={11}
              />
              <Tooltip
                cursor={{ stroke: "rgba(105,255,151,0.20)", strokeWidth: 1 }}
                contentStyle={TooltipStyle}
              />
              <Line
                type="monotone"
                dataKey="cumDecisions"
                name="Decisions"
                stroke="#69FF97"
                strokeWidth={2.5}
                dot={{ r: 4, fill: "#69FF97", strokeWidth: 0 }}
                activeDot={{ r: 6, fill: "#00E4FF", strokeWidth: 0 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
