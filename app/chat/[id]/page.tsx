// app/chat/[id]/page.tsx
import { auth } from "@clerk/nextjs/server";
import { notFound, redirect } from "next/navigation";
import ChatWorkspace from "@/components/ChatWorkspace";
import {
  getChatById,
  getChatSidebarData,
  getChatTranscriptSegments,
  getUserByClerkId,
} from "@/lib/chat-workspace";

export default async function ChatDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const { userId: clerkUserId } = auth();
  if (!clerkUserId) return null;

  const user = await getUserByClerkId(clerkUserId);
  if (!user) redirect("/dashboard");

  const [sidebarData, activeChat, transcriptSegments] = await Promise.all([
    getChatSidebarData(user.id),
    getChatById(params.id, user.id),
    getChatTranscriptSegments(params.id, user.id),
  ]);

  if (!activeChat) notFound();

  // Parse references JSON string on each assistant message
  const messagesWithRefs = activeChat.messages.map((msg) => ({
    ...msg,
    role: msg.role as "user" | "assistant",
    // references is stored as JSON string in DB, parse it back to array
    references:
      msg.role === "assistant" && (msg as any).references
        ? (() => {
            try {
              const segIds: string[] = JSON.parse((msg as any).references);
              // Match IDs to full segment objects
              return segIds
                .map((id) => {
                  const seg = transcriptSegments.find((s) => s.id === id);
                  if (!seg) return null;
                  return {
                    segmentId: seg.id,
                    speaker: seg.speaker,
                    text: seg.text,
                    startTime: seg.startTime,
                    meetingTitle: seg.meeting.title,
                    meetingFileName: seg.meeting.fileName,
                  };
                })
                .filter(Boolean);
            } catch {
              return [];
            }
          })()
        : [],
  }));

  return (
    <ChatWorkspace
      meetingChats={sidebarData.meetingChats}
      projectChats={sidebarData.projectChats}
      projects={sidebarData.projects}
      activeChat={{ ...activeChat, messages: messagesWithRefs } as any}
      transcriptSegments={transcriptSegments.map((seg) => ({
        id: seg.id,
        speaker: seg.speaker,
        text: seg.text,
        startTime: seg.startTime,
        meetingFileName: seg.meeting.fileName,
        meetingTitle: seg.meeting.title,
      }))}
    />
  );
}
