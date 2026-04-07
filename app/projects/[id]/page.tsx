//app/projects/[id]/page.tsx
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Navbar from "@/components/Navbar";
import ProjectInsights from "@/components/ProjectInsights";
import ProjectOverviewCharts from "@/components/ProjectOverviewCharts";
import Link from "next/link";
import {
  ArrowLeft,
  FileText,
  Calendar,
  Users,
  AlignLeft,
  ChevronRight,
  CheckSquare,
  TrendingUp,
} from "lucide-react";

import { formatDate } from "@/lib/utils";
import {
  summarizeProjectDecisions,
  summarizeProjectSentiment,
} from "@/lib/project-insights";

async function getProject(projectId: string, clerkUserId: string) {
  const user = await prisma.user.findUnique({ where: { clerkUserId } });
  if (!user) return null;

  return prisma.project.findFirst({
    where: { id: projectId, ownerId: user.id },
    include: {
      meetings: {
        include: {
          decisions: {
            orderBy: { createdAt: "desc" },
          },
          actionItems: {
            orderBy: { createdAt: "desc" },
          },
          sentiments: {
            orderBy: { createdAt: "desc" },
          },
          _count: {
            select: { actionItems: true, decisions: true, segments: true },
          },
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });
}

const statusColors: Record<string, string> = {
  UPLOADED: "bg-slate-700/60 text-slate-200 border border-slate-500/20",
  PARSING: "bg-sky-500/15 text-sky-300 border border-sky-500/20",
  PARSED: "bg-cyan-500/15 text-cyan-300 border border-cyan-500/20",
  ANALYZING: "bg-amber-500/15 text-amber-300 border border-amber-500/20",
  ANALYZED: "bg-emerald-500/15 text-emerald-300 border border-emerald-500/20",
  ERROR: "bg-red-500/15 text-red-300 border border-red-500/20",
};

export default async function ProjectPage({
  params,
}: {
  params: { id: string };
}) {
  const { userId } = auth();
  if (!userId) return null;

  const project = await getProject(params.id, userId);
  if (!project) notFound();

  const initialDecisionSummary = summarizeProjectDecisions(project.meetings);
  const initialSentimentSummary = summarizeProjectSentiment(project.meetings);

  const totalSegments = project.meetings.reduce(
    (sum, meeting) => sum + meeting._count.segments,
    0,
  );
  const totalWords = project.meetings.reduce(
    (sum, meeting) => sum + meeting.wordCount,
    0,
  );
  const chartData = project.meetings.map((meeting, index) => ({
    name: meeting.title.length > 14 ? `M${index + 1}` : meeting.title,
    segments: meeting._count.segments,
    actions: meeting._count.actionItems,
    decisions: meeting._count.decisions,
  }));

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#050a00] text-[#d5f5dc]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(105,255,151,0.18),transparent_28%),radial-gradient(circle_at_85%_20%,rgba(0,228,255,0.12),transparent_24%),radial-gradient(circle_at_bottom,rgba(38,162,105,0.16),transparent_30%),linear-gradient(180deg,#050a00_0%,#071005_55%,#050a00_100%)]" />
      <div className="absolute inset-0 opacity-30 [background-image:linear-gradient(rgba(38,162,105,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(38,162,105,0.08)_1px,transparent_1px)] [background-size:72px_72px]" />

      <div className="relative z-10">
        <Navbar />
        <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <section className="rounded-[32px] border border-[#26a269]/18 bg-[#081004]/76 px-6 py-8 shadow-[0_30px_80px_rgba(0,0,0,0.35)] backdrop-blur-xl sm:px-8">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 text-sm text-[#8fb79a] transition-colors hover:text-[#d5f5dc]"
            >
              <ArrowLeft size={14} />
              Back to dashboard
            </Link>

            <div className="mt-6 flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-3xl">
                <p className="text-sm uppercase tracking-[0.22em] text-[#69FF97]">
                  Project Workspace
                </p>
                <h1 className="mt-4 text-4xl font-semibold tracking-[-0.05em] text-[#f6fff7] sm:text-5xl">
                  {project.name}
                </h1>
                <p className="mt-4 text-sm leading-7 text-[#8fb79a] sm:text-base">
                  {project.meetings.length} meeting
                  {project.meetings.length !== 1 ? "s" : ""} in this project ·
                  created {formatDate(project.createdAt)}
                </p>
              </div>

              <Link
                href={`/chat?projectId=${project.id}`}
                className="plasma-button plasma-button-secondary inline-flex items-center gap-2 self-start rounded-full px-6 py-3 text-sm font-medium text-[#041102] transition-transform hover:scale-[1.01]"
              >
                Open project chat
              </Link>
            </div>

            <div className="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {[
                {
                  label: "Meetings",
                  value: project.meetings.length,
                  icon: FileText,
                  tone: "text-[#69FF97]",
                },
                {
                  label: "Segments",
                  value: totalSegments,
                  icon: AlignLeft,
                  tone: "text-[#00E4FF]",
                },
                {
                  label: "Actions",
                  value: initialDecisionSummary.totalActionItems,
                  icon: CheckSquare,
                  tone: "text-[#9affba]",
                },
                {
                  label: "Decisions",
                  value: initialDecisionSummary.totalDecisions,
                  icon: TrendingUp,
                  tone: "text-[#d5f5dc]",
                },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-[24px] border border-[#26a269]/12 bg-[#0a1406]/72 p-5"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs uppercase tracking-[0.18em] text-[#70907a]">
                      {stat.label}
                    </span>
                    <stat.icon size={16} className={stat.tone} />
                  </div>
                  <div className="mt-5 text-3xl font-semibold tracking-[-0.04em] text-[#f6fff7]">
                    {stat.value}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {project.meetings.length > 0 && (
            <div className="mt-10">
              <ProjectOverviewCharts meetingData={chartData} />
            </div>
          )}

          <section className="mt-10">
            <div className="mb-5 flex items-end justify-between gap-4">
              <div>
                <h2 className="text-2xl font-semibold text-[#f6fff7]">
                  Meetings
                </h2>
                <p className="mt-1 text-sm text-[#8fb79a]">
                  {totalWords.toLocaleString()} words across the full project
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {project.meetings.length === 0 && (
                <div className="rounded-[32px] border border-[#26a269]/14 bg-[#081004]/72 px-6 py-16 text-center shadow-[0_25px_70px_rgba(0,0,0,0.28)] backdrop-blur-xl sm:px-8">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[22px] border border-[#26a269]/16 bg-[#0d1808] text-[#69FF97]">
                    <FileText size={28} />
                  </div>
                  <h2 className="mt-6 text-2xl font-semibold text-[#f6fff7]">
                    No meetings yet
                  </h2>
                  <p className="mx-auto mt-3 max-w-md text-sm leading-7 text-[#8fb79a]">
                    Upload a transcript to start building decision and sentiment
                    analysis for this project.
                  </p>
                  <Link
                    href="/upload"
                    className="plasma-button plasma-button-primary mt-8 inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-medium text-white transition-transform hover:scale-[1.01]"
                  >
                    Upload transcript
                  </Link>
                </div>
              )}

              {project.meetings.map((meeting) => (
                <Link
                  key={meeting.id}
                  href={`/projects/${project.id}/meetings/${meeting.id}`}
                  className="group flex items-center gap-4 rounded-[28px] border border-[#26a269]/12 bg-[#081004]/76 p-5 shadow-[0_18px_40px_rgba(0,0,0,0.22)] transition-all hover:border-[#26a269]/24 hover:bg-[#0b1507]"
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[#26a269]/16 bg-[#0d1808] text-[#69FF97]">
                    <FileText size={18} />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="mb-2 flex items-center gap-3">
                      <h3 className="truncate text-base font-medium text-[#f6fff7] transition-colors group-hover:text-[#69FF97]">
                        {meeting.title}
                      </h3>
                      <span
                        className={`rounded-full px-2.5 py-1 text-[11px] font-medium capitalize ${statusColors[meeting.status]}`}
                      >
                        {meeting.status.toLowerCase()}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-4 text-xs text-[#70907a]">
                      <span className="flex items-center gap-1.5">
                        <Calendar size={12} />
                        {formatDate(meeting.createdAt)}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Users size={12} />
                        {meeting.speakerCount} speakers
                      </span>
                      <span className="flex items-center gap-1.5">
                        <AlignLeft size={12} />
                        {meeting.wordCount.toLocaleString()} words
                      </span>
                    </div>
                  </div>

                  <div className="hidden items-center gap-5 text-center md:flex">
                    <div>
                      <div className="text-lg font-semibold text-[#f6fff7]">
                        {meeting._count.segments}
                      </div>
                      <div className="text-[11px] text-[#70907a]">segments</div>
                    </div>
                    <div>
                      <div className="text-lg font-semibold text-[#f6fff7]">
                        {meeting._count.actionItems}
                      </div>
                      <div className="text-[11px] text-[#70907a]">actions</div>
                    </div>
                    <div>
                      <div className="text-lg font-semibold text-[#f6fff7]">
                        {meeting._count.decisions}
                      </div>
                      <div className="text-[11px] text-[#70907a]">
                        decisions
                      </div>
                    </div>
                  </div>

                  <ChevronRight
                    size={16}
                    className="flex-shrink-0 text-[#5f7c68] transition-colors group-hover:text-[#d5f5dc]"
                  />
                </Link>
              ))}
            </div>
          </section>

          <ProjectInsights
            projectId={project.id}
            initialDecisions={initialDecisionSummary}
            initialSentiment={initialSentimentSummary}
          />
        </main>
      </div>
    </div>
  );
}
