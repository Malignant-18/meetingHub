import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import ChatWorkspace from "@/components/ChatWorkspace";
import {
  getChatSidebarData,
  getUserByClerkId,
} from "@/lib/chat-workspace";

export default async function ChatPage({
  searchParams,
}: {
  searchParams?: { projectId?: string; meetingId?: string };
}) {
  const { userId: clerkUserId } = auth();
  if (!clerkUserId) return null;

  const user = await getUserByClerkId(clerkUserId);
  if (!user) redirect("/dashboard");

  const { meetingChats, projectChats, projects } = await getChatSidebarData(
    user.id,
  );

  const serializedMeetingChats = meetingChats.map((chat) => ({
    ...chat,
    createdAt: chat.createdAt.toISOString(),
    updatedAt: chat.updatedAt.toISOString(),
    contexts: chat.contexts.map((context) => ({
      ...context,
      meeting: {
        ...context.meeting,
        createdAt: context.meeting.createdAt.toISOString(),
      },
    })),
  }));

  const serializedProjectChats = projectChats.map((chat) => ({
    ...chat,
    createdAt: chat.createdAt.toISOString(),
    updatedAt: chat.updatedAt.toISOString(),
    contexts: chat.contexts.map((context) => ({
      ...context,
      meeting: {
        ...context.meeting,
        createdAt: context.meeting.createdAt.toISOString(),
      },
    })),
  }));

  const serializedProjects = projects.map((project) => ({
    ...project,
    createdAt: project.createdAt.toISOString(),
    meetings: project.meetings.map((meeting) => ({
      ...meeting,
      createdAt: meeting.createdAt.toISOString(),
    })),
  }));

  return (
    <ChatWorkspace
      meetingChats={serializedMeetingChats as any}
      projectChats={serializedProjectChats as any}
      projects={serializedProjects}
      initialProjectId={searchParams?.projectId ?? null}
      initialMeetingId={searchParams?.meetingId ?? null}
    />
  );
}
