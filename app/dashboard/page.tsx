// app/dashboard/page.tsx
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import {
  Plus,
  FolderOpen,
  FileText,
  CheckSquare,
  TrendingUp,
} from "lucide-react";
import { formatDate } from "@/lib/utils";

async function getProjects(clerkUserId: string) {
  // Ensure user exists in our DB
  const user = await prisma.user.upsert({
    where: { clerkUserId },
    update: {},
    create: {
      clerkUserId,
      email: "", // Will be filled by webhook later
    },
  });

  const projects = await prisma.project.findMany({
    where: { ownerId: user.id },
    include: {
      meetings: {
        include: {
          _count: { select: { actionItems: true, decisions: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return projects.map((p) => ({
    id: p.id,
    name: p.name,
    createdAt: p.createdAt,
    meetingCount: p.meetings.length,
    totalActionItems: p.meetings.reduce(
      (sum, m) => sum + m._count.actionItems,
      0,
    ),
    totalDecisions: p.meetings.reduce((sum, m) => sum + m._count.decisions, 0),
  }));
}

export default async function DashboardPage() {
  const { userId } = auth();
  if (!userId) return null;

  const projects = await getProjects(userId);

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Your Projects</h1>
          <p className="text-slate-400 text-sm mt-1">
            {projects.length} project{projects.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Link
          href="/upload"
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors"
        >
          <Plus size={16} />
          New project
        </Link>
      </div>

      {/* Stats row
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total projects', value: projects.length, icon: FolderOpen, color: 'text-indigo-400' },
          { label: 'Total meetings', value: projects.reduce((s, p) => s + p.meetingCount, 0), icon: FileText, color: 'text-purple-400' },
          { label: 'Action items', value: projects.reduce((s, p) => s + p.totalActionItems, 0), icon: CheckSquare, color: 'text-emerald-400' },
          { label: 'Decisions made', value: projects.reduce((s, p) => s + p.totalDecisions, 0), icon: TrendingUp, color: 'text-amber-400' },
        ].map((stat) => (
          <div key={stat.label} className="bg-[#1e1c32] border border-slate-700/50 rounded-xl p-4">
            <stat.icon size={18} className={`${stat.color} mb-2`} />
            <div className="text-2xl font-bold text-white">{stat.value}</div>
            <div className="text-slate-400 text-xs mt-0.5">{stat.label}</div>
          </div>
        ))}
      </div>
*/}
      {/* Empty state */}
      {projects.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-16 h-16 rounded-2xl bg-indigo-600/10 border border-indigo-600/20 flex items-center justify-center mb-4">
            <FolderOpen size={28} className="text-indigo-400" />
          </div>
          <h2 className="text-white font-semibold text-lg mb-2">
            No projects yet
          </h2>
          <p className="text-slate-400 text-sm mb-6 max-w-xs">
            Create your first project by uploading a meeting transcript
          </p>
          <Link
            href="/upload"
            className="bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium px-6 py-2.5 rounded-xl transition-colors"
          >
            Upload your first transcript
          </Link>
        </div>
      )}

      {/* Project grid */}
      {projects.length > 0 && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((project) => (
            <Link
              key={project.id}
              href={`/projects/${project.id}`}
              className="bg-[#1e1c32] border border-slate-700/50 hover:border-indigo-500/50 rounded-xl p-5 transition-all hover:bg-[#252340] group"
            >
              {/* Project header */}
              <div className="flex items-start justify-between mb-4">
                <div className="w-10 h-10 rounded-lg bg-indigo-600/20 flex items-center justify-center">
                  <FolderOpen size={18} className="text-indigo-400" />
                </div>
                <span className="text-xs text-slate-500">
                  {formatDate(project.createdAt)}
                </span>
              </div>

              <h3 className="font-semibold text-white mb-1 group-hover:text-indigo-300 transition-colors">
                {project.name}
              </h3>

              {/* Stats */}
              <div className="flex items-center gap-4 mt-4 pt-4 border-t border-slate-700/50">
                <div className="text-center">
                  <div className="text-lg font-bold text-white">
                    {project.meetingCount}
                  </div>
                  <div className="text-xs text-slate-500">meetings</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-white">
                    {project.totalActionItems}
                  </div>
                  <div className="text-xs text-slate-500">actions</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-white">
                    {project.totalDecisions}
                  </div>
                  <div className="text-xs text-slate-500">decisions</div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
