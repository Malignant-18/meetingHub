// app/projects/[id]/page.tsx
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Navbar from "@/components/Navbar";
import ProjectInsights from "@/components/ProjectInsights";
import ProjectOverviewCharts from "@/components/ProjectOverviewCharts";
import Link from "next/link";
import {
  FileText,
  Calendar,
  Users,
  AlignLeft,
  ChevronRight,
  MessageSquare,
  Upload,
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
          decisions: { orderBy: { createdAt: "desc" } },
          actionItems: { orderBy: { createdAt: "desc" } },
          sentiments: { orderBy: { createdAt: "desc" } },
          _count: {
            select: { actionItems: true, decisions: true, segments: true },
          },
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });
}

const STATUS_COLORS: Record<string, string> = {
  UPLOADED: "bg-slate-700/60 text-slate-300 border border-slate-600/20",
  PARSING: "bg-sky-500/15 text-sky-300 border border-sky-500/20",
  PARSED: "bg-[#00E4FF]/10 text-[#00E4FF] border border-[#00E4FF]/20",
  ANALYZING: "bg-amber-500/15 text-amber-300 border border-amber-500/20",
  ANALYZED: "bg-[#26a269]/15 text-[#69FF97] border border-[#26a269]/25",
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

  const decisionSummary = summarizeProjectDecisions(project.meetings);
  const sentimentSummary = summarizeProjectSentiment(project.meetings);

  const chartData = project.meetings.map((m, i) => ({
    name: m.title.length > 14 ? `M${i + 1}` : m.title,
    segments: m._count.segments,
    actions: m._count.actionItems,
    decisions: m._count.decisions,
  }));

  const hasAnalyzedMeetings = project.meetings.some(
    (m) => m.status === "ANALYZED",
  );

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#050a00] text-[#d5f5dc]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(105,255,151,0.16),transparent_28%),radial-gradient(circle_at_85%_20%,rgba(0,228,255,0.10),transparent_24%),radial-gradient(circle_at_bottom,rgba(38,162,105,0.14),transparent_30%),linear-gradient(180deg,#050a00_0%,#071005_55%,#050a00_100%)]" />
      <div className="absolute inset-0 opacity-25 [background-image:linear-gradient(rgba(38,162,105,0.07)_1px,transparent_1px),linear-gradient(90deg,rgba(38,162,105,0.07)_1px,transparent_1px)] [background-size:72px_72px]" />

      <div className="relative z-10">
        <Navbar />
        <main className="mx-auto max-w-7xl space-y-10 px-4 py-10 sm:px-6 lg:px-8">
          {/* Hero */}
          <section className="rounded-[32px] border border-[#26a269]/20 bg-[#081004]/80 px-6 py-8 shadow-[0_28px_72px_rgba(0,0,0,0.32)] backdrop-blur-xl sm:px-8">
            <nav className="flex items-center gap-2 text-sm text-[#8fb79a]">
              <Link
                href="/dashboard"
                className="transition-colors hover:text-[#d5f5dc]"
              >
                Dashboard
              </Link>
              <span className="text-[#26a269]/40">/</span>
              <span className="max-w-60 truncate text-[#d5f5dc]">
                {project.name}
              </span>
            </nav>

            <div className="mt-5 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.22em] text-[#69FF97]">
                  Project workspace
                </p>
                <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-[#f6fff7] sm:text-4xl">
                  {project.name}
                </h1>
                <p className="mt-2 text-sm text-[#8fb79a]">
                  {project.meetings.length} meeting
                  {project.meetings.length !== 1 ? "s" : ""}
                  {" · "}created {formatDate(project.createdAt)}
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Link
                  href="/upload"
                  className="inline-flex items-center gap-2 rounded-full border border-[#26a269]/20 bg-[#0d1808] px-5 py-2.5 text-sm font-medium text-[#9fd8ad] transition-colors hover:border-[#26a269]/35 hover:text-[#d5f5dc]"
                >
                  <Upload size={14} />
                  Upload transcript
                </Link>
                <Link
                  href={`/chat?projectId=${project.id}`}
                  className="inline-flex items-center gap-2 rounded-full bg-[#26a269] px-5 py-2.5 text-sm font-medium text-[#041102] transition-colors hover:bg-[#30bb77]"
                >
                  <MessageSquare size={14} />
                  Project chat
                </Link>
              </div>
            </div>
          </section>

          {/* Meetings — always first */}
          <section>
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-[#f6fff7]">Meetings</h2>
              <Link
                href="/upload"
                className="text-sm text-[#26a269] transition-colors hover:text-[#69FF97]"
              >
                + Add meeting
              </Link>
            </div>

            {project.meetings.length === 0 ? (
              <div className="rounded-[28px] border border-[#26a269]/20 bg-[#081004]/80 px-6 py-16 text-center backdrop-blur-xl">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-[18px] border border-[#26a269]/20 bg-[#0d1808] text-[#69FF97]">
                  <FileText size={24} />
                </div>
                <h3 className="text-lg font-semibold text-[#f6fff7]">
                  No meetings yet
                </h3>
                <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-[#8fb79a]">
                  Upload a .txt or .vtt transcript to start extracting
                  decisions, actions, and sentiment.
                </p>
                <Link
                  href="/upload"
                  className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#26a269] px-6 py-3 text-sm font-medium text-[#041102] transition-colors hover:bg-[#30bb77]"
                >
                  <Upload size={14} />
                  Upload transcript
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {project.meetings.map((meeting) => (
                  <Link
                    key={meeting.id}
                    href={`/projects/${project.id}/meetings/${meeting.id}`}
                    className="group flex items-center gap-4 rounded-[24px] border border-[#26a269]/20 bg-[#081004]/80 p-5 shadow-[0_12px_32px_rgba(0,0,0,0.18)] backdrop-blur-xl transition-all hover:border-[#26a269]/35 hover:bg-[#0b1507]"
                  >
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border border-[#26a269]/20 bg-[#0d1808] text-[#69FF97]">
                      <FileText size={16} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="mb-1.5 flex flex-wrap items-center gap-3">
                        <h3 className="truncate text-sm font-medium text-[#f6fff7] transition-colors group-hover:text-[#69FF97]">
                          {meeting.title}
                        </h3>
                        <span
                          className={`flex-shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-medium capitalize ${STATUS_COLORS[meeting.status]}`}
                        >
                          {meeting.status.toLowerCase()}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-3 text-[11px] text-[#70907a]">
                        <span className="flex items-center gap-1">
                          <Calendar size={10} />
                          {formatDate(meeting.createdAt)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Users size={10} />
                          {meeting.speakerCount} speakers
                        </span>
                        <span className="flex items-center gap-1">
                          <AlignLeft size={10} />
                          {meeting.wordCount.toLocaleString()} words
                        </span>
                      </div>
                    </div>
                    <div className="hidden items-center gap-5 text-center md:flex">
                      <div>
                        <div className="text-base font-semibold text-[#f6fff7]">
                          {meeting._count.actionItems}
                        </div>
                        <div className="text-[10px] text-[#70907a]">
                          actions
                        </div>
                      </div>
                      <div>
                        <div className="text-base font-semibold text-[#f6fff7]">
                          {meeting._count.decisions}
                        </div>
                        <div className="text-[10px] text-[#70907a]">
                          decisions
                        </div>
                      </div>
                    </div>
                    <ChevronRight
                      size={14}
                      className="flex-shrink-0 text-[#5f7c68] transition-colors group-hover:text-[#d5f5dc]"
                    />
                  </Link>
                ))}
              </div>
            )}
          </section>

          {/* Charts — only with 2+ meetings */}
          {project.meetings.length > 1 && (
            <ProjectOverviewCharts meetingData={chartData} />
          )}

          {/* Project-level AI insights */}
          {hasAnalyzedMeetings && (
            <ProjectInsights
              projectId={project.id}
              initialDecisions={decisionSummary}
              initialSentiment={sentimentSummary}
            />
          )}

          {/* Nudge to run analysis */}
          {!hasAnalyzedMeetings && project.meetings.length > 0 && (
            <div className="rounded-[24px] border border-[#26a269]/20 bg-[#081004]/60 px-6 py-8 text-center backdrop-blur-xl">
              <p className="text-sm text-[#8fb79a]">
                Open a meeting and run{" "}
                <span className="text-[#69FF97]">AI Analysis</span> to unlock
                project-level insights here.
              </p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
