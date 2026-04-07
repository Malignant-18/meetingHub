import { auth } from "@clerk/nextjs/server";
import Link from "next/link";
import { ArrowRight, FolderOpen, Plus } from "lucide-react";

import DashboardOnboarding from "@/components/DashboardOnboarding";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/utils";
import { getOrSyncUser } from "@/lib/auth-user";

async function getProjects(clerkUserId: string) {
  const user = await getOrSyncUser(clerkUserId);

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

  return {
    user,
    projects: projects.map((project) => ({
      id: project.id,
      name: project.name,
      createdAt: project.createdAt,
      meetingCount: project.meetings.length,
      totalActionItems: project.meetings.reduce(
        (sum, meeting) => sum + meeting._count.actionItems,
        0,
      ),
      totalDecisions: project.meetings.reduce(
        (sum, meeting) => sum + meeting._count.decisions,
        0,
      ),
    })),
  };
}

export default async function DashboardPage() {
  const { userId } = auth();
  if (!userId) return null;

  const { user, projects } = await getProjects(userId);
  const firstName = user.name?.split(" ")[0] ?? "there";

  return (
    <div className="space-y-12">
      <DashboardOnboarding />

      <section
        data-tour="dashboard-welcome"
        className="rounded-[32px]   px-6 py-12 text-center sm:px-8"
      >
        <p className="text-sm uppercase tracking-[0.22em] text-[#69FF97]">
          Mr.Minutes
        </p>
        <h1 className="mt-5 text-4xl font-semibold tracking-[-0.05em] text-[#f6fff7] sm:text-5xl">
          Welcome {firstName}
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-sm leading-7 text-[#8fb79a] sm:text-base">
          Upload meeting transcripts, extract decisions and action items,
          analyze speaker sentiment, and query discussions through a contextual
          AI chat workspace.
        </p>

        <div className="mt-8 flex justify-center">
          <Link
            href="/upload"
            data-tour="dashboard-create-project"
            className="plasma-button plasma-button-secondary inline-flex items-center gap-2 rounded-full px-7 py-3 text-sm font-medium text-[#041102] transition-transform hover:scale-[1.01]"
          >
            <Plus size={16} />
            Create project
          </Link>
        </div>
      </section>

      <section data-tour="dashboard-projects">
        <div className="mb-5 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold text-[#f6fff7]">
              Your Projects
            </h2>
            <p className="mt-1 text-sm text-[#8fb79a]">
              {projects.length} project{projects.length !== 1 ? "s" : ""} in
              your workspace
            </p>
          </div>
        </div>

        {projects.length === 0 ? (
          <div className="rounded-[32px] border border-[#26a269]/20 bg-[#081004]/72 px-6 py-16 text-center shadow-[0_25px_70px_rgba(0,0,0,0.28)] backdrop-blur-xl sm:px-8">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[22px] border border-[#26a269]/16 bg-[#0d1808] text-[#69FF97]">
              <FolderOpen size={28} />
            </div>
            <h2 className="mt-6 text-2xl font-semibold text-[#f6fff7]">
              No projects yet
            </h2>
            <p className="mx-auto mt-3 max-w-md text-sm leading-7 text-[#8fb79a]">
              Start by uploading a transcript into a new project. Mr.Minutes
              will organize uploads, analysis, sentiment, and chat around that
              workspace.
            </p>
            <Link
              href="/upload"
              className="plasma-button plasma-button-primary mt-8 inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-medium text-white transition-transform hover:scale-[1.01]"
            >
              Upload your first transcript
              <ArrowRight size={15} />
            </Link>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {projects.map((project) => (
              <Link
                key={project.id}
                href={`/projects/${project.id}`}
                className="group rounded-[20px] border border-[#26a269]/20 bg-[#081004]/76 p-5 shadow-[0_18px_40px_rgba(0,0,0,0.22)] transition-all hover:border-[#26a269]/26 hover:bg-[#0b1507]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[#26a269]/16 bg-[#0d1808] text-[#69FF97]">
                    <FolderOpen size={18} />
                  </div>
                  <span className="text-xs text-[#70907a]">
                    {formatDate(project.createdAt)}
                  </span>
                </div>

                <h3 className="mt-5 text-lg font-semibold text-[#f6fff7] transition-colors group-hover:text-[#69FF97]">
                  {project.name}
                </h3>

                <div className="mt-6 grid grid-cols-3 gap-3 border-t border-[#26a269]/10 pt-4">
                  <div>
                    <p className="text-2xl font-semibold text-[#f6fff7]">
                      {project.meetingCount}
                    </p>
                    <p className="mt-1 text-xs text-[#70907a]">meetings</p>
                  </div>
                  <div>
                    <p className="text-2xl font-semibold text-[#f6fff7]">
                      {project.totalActionItems}
                    </p>
                    <p className="mt-1 text-xs text-[#70907a]">actions</p>
                  </div>
                  <div>
                    <p className="text-2xl font-semibold text-[#f6fff7]">
                      {project.totalDecisions}
                    </p>
                    <p className="mt-1 text-xs text-[#70907a]">decisions</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
