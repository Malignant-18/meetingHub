// app/projects/[id]/page.tsx
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Navbar from "@/components/Navbar";
import ProjectInsights from "@/components/ProjectInsights";
import Link from "next/link";
import {
  ArrowLeft,
  FileText,
  Calendar,
  Users,
  AlignLeft,
  ChevronRight,
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
        orderBy: { createdAt: "desc" },
      },
    },
  });
}

const statusColors: Record<string, string> = {
  UPLOADED: "bg-slate-700 text-slate-300",
  PARSING: "bg-blue-900 text-blue-300",
  PARSED: "bg-indigo-900 text-indigo-300",
  ANALYZING: "bg-amber-900 text-amber-300",
  ANALYZED: "bg-emerald-900 text-emerald-300",
  ERROR: "bg-red-900 text-red-300",
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

  return (
    <div className="min-h-screen bg-[#0f0e1a]">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* Back + header */}
        <div className="mb-8">
          <Link
            href="/dashboard"
            className="flex items-center gap-1.5 text-slate-400 hover:text-white text-sm mb-4 transition-colors w-fit"
          >
            <ArrowLeft size={14} />
            Back to dashboard
          </Link>
          <h1 className="text-2xl font-bold text-white">{project.name}</h1>
          <p className="text-slate-400 text-sm mt-1">
            {project.meetings.length} meeting
            {project.meetings.length !== 1 ? "s" : ""} · Created{" "}
            {formatDate(project.createdAt)}
          </p>
        </div>

        {/* Meeting list */}
        <div className="space-y-3">
          {project.meetings.length === 0 && (
            <div className="text-center py-16 text-slate-500">
              <FileText size={32} className="mx-auto mb-3 opacity-40" />
              <p>No meetings yet. Upload a transcript to get started.</p>
              <Link
                href="/upload"
                className="mt-4 inline-block text-indigo-400 hover:text-indigo-300 text-sm"
              >
                Upload transcript →
              </Link>
            </div>
          )}

          {project.meetings.map((meeting) => (
            <Link
              key={meeting.id}
              href={`/projects/${project.id}/meetings/${meeting.id}`}
              className="flex items-center gap-4 bg-[#1e1c32] border border-slate-700/50 hover:border-indigo-500/40 rounded-xl p-5 transition-all hover:bg-[#252340] group"
            >
              <div className="w-10 h-10 rounded-lg bg-indigo-600/20 flex items-center justify-center flex-shrink-0">
                <FileText size={18} className="text-indigo-400" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-1">
                  <h3 className="font-medium text-white group-hover:text-indigo-300 transition-colors truncate">
                    {meeting.title}
                  </h3>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${statusColors[meeting.status]}`}
                  >
                    {meeting.status.toLowerCase()}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-xs text-slate-500">
                  <span className="flex items-center gap-1">
                    <Calendar size={11} />
                    {formatDate(meeting.createdAt)}
                  </span>
                  <span className="flex items-center gap-1">
                    <Users size={11} />
                    {meeting.speakerCount} speakers
                  </span>
                  <span className="flex items-center gap-1">
                    <AlignLeft size={11} />
                    {meeting.wordCount.toLocaleString()} words
                  </span>
                </div>
              </div>

              {/* Stats */}
              <div className="hidden sm:flex items-center gap-4 text-center flex-shrink-0">
                <div>
                  <div className="text-sm font-bold text-white">
                    {meeting._count.segments}
                  </div>
                  <div className="text-xs text-slate-500">segments</div>
                </div>
                <div>
                  <div className="text-sm font-bold text-white">
                    {meeting._count.actionItems}
                  </div>
                  <div className="text-xs text-slate-500">actions</div>
                </div>
                <div>
                  <div className="text-sm font-bold text-white">
                    {meeting._count.decisions}
                  </div>
                  <div className="text-xs text-slate-500">decisions</div>
                </div>
              </div>

              <ChevronRight
                size={16}
                className="text-slate-600 flex-shrink-0"
              />
            </Link>
          ))}
        </div>

        <ProjectInsights
          projectId={project.id}
          initialDecisions={initialDecisionSummary}
          initialSentiment={initialSentimentSummary}
        />
      </main>
    </div>
  );
}
