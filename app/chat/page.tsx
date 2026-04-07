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

  return (
    <ChatWorkspace
      meetingChats={meetingChats}
      projectChats={projectChats}
      projects={projects}
      initialProjectId={searchParams?.projectId ?? null}
      initialMeetingId={searchParams?.meetingId ?? null}
    />
  );
}
