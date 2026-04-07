"use client";

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

type ProjectOverviewChartsProps = {
  meetingData: MeetingChartPoint[];
};

export default function ProjectOverviewCharts({
  meetingData,
}: ProjectOverviewChartsProps) {
  if (meetingData.length === 0) return null;

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <section className="rounded-[28px] border border-[#26a269]/12 bg-[#081004]/76 p-5 shadow-[0_18px_40px_rgba(0,0,0,0.22)]">
        <div className="mb-5">
          <h3 className="text-lg font-semibold text-[#f6fff7]">
            Meeting activity
          </h3>
          <p className="mt-1 text-sm text-[#8fb79a]">
            Compare segments, action items, and decisions across meetings.
          </p>
        </div>
        <div className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={meetingData} barGap={6}>
              <CartesianGrid stroke="rgba(38,162,105,0.12)" vertical={false} />
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
                cursor={{ fill: "rgba(38,162,105,0.08)" }}
                contentStyle={{
                  background: "#081004",
                  border: "1px solid rgba(38,162,105,0.18)",
                  borderRadius: 16,
                  color: "#f6fff7",
                }}
              />
              <Bar dataKey="segments" fill="#00E4FF" radius={[8, 8, 0, 0]} />
              <Bar dataKey="actions" fill="#69FF97" radius={[8, 8, 0, 0]} />
              <Bar dataKey="decisions" fill="#26a269" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="rounded-[28px] border border-[#26a269]/12 bg-[#081004]/76 p-5 shadow-[0_18px_40px_rgba(0,0,0,0.22)]">
        <div className="mb-5">
          <h3 className="text-lg font-semibold text-[#f6fff7]">
            Decisions trend
          </h3>
          <p className="mt-1 text-sm text-[#8fb79a]">
            Track how decisions accumulate as meetings stack up in the project.
          </p>
        </div>
        <div className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={meetingData.map((meeting, index) => ({
                ...meeting,
                cumulativeDecisions: meetingData
                  .slice(0, index + 1)
                  .reduce((sum, item) => sum + item.decisions, 0),
              }))}
            >
              <CartesianGrid stroke="rgba(38,162,105,0.12)" vertical={false} />
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
                cursor={{ stroke: "rgba(105,255,151,0.2)", strokeWidth: 1 }}
                contentStyle={{
                  background: "#081004",
                  border: "1px solid rgba(38,162,105,0.18)",
                  borderRadius: 16,
                  color: "#f6fff7",
                }}
              />
              <Line
                type="monotone"
                dataKey="cumulativeDecisions"
                stroke="#69FF97"
                strokeWidth={3}
                dot={{ r: 4, fill: "#69FF97" }}
                activeDot={{ r: 6, fill: "#00E4FF" }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>
    </div>
  );
}
