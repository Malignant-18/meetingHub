"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import {
  AlertCircle,
  Bot,
  Check,
  Copy,
  Ellipsis,
  Home,
  PanelLeftClose,
  PanelLeftOpen,
  FileText,
  Loader2,
  MessageSquare,
  Pencil,
  Plus,
  Send,
  Trash2,
  Link2,
  Upload,
} from "lucide-react";

import { cn, formatDate } from "@/lib/utils";
import TranscriptPanel, {
  type TranscriptSegmentData,
} from "@/components/TranscriptPanel";

// ─── Types ────────────────────────────────────────────────────────────────────
type ChatScope = "MEETING" | "PROJECT";

interface ChatContext {
  meetingId: string;
  meeting: {
    id: string;
    title: string;
    fileName: string;
    createdAt: string;
  };
}

interface ChatListItem {
  id: string;
  title: string;
  scope: ChatScope;
  createdAt: string;
  updatedAt: string;
  _count: { messages: number };
  contexts: ChatContext[];
  project: { id: string; name: string };
}

// Reference from Gemini — a cited transcript segment
interface SegmentReference {
  segmentId: string;
  speaker: string;
  text: string;
  startTime: string | null;
  meetingTitle: string;
  meetingFileName: string;
}

interface Message {
  id?: string;
  role: "user" | "assistant";
  content: string;
  createdAt?: string;
  references?: SegmentReference[]; // only on assistant messages
}

interface ProjectOption {
  id: string;
  name: string;
  meetings: {
    id: string;
    title: string;
    fileName: string;
    createdAt: string | Date;
  }[];
}

interface ActiveChat extends ChatListItem {
  messages: Message[];
}

interface Props {
  meetingChats: ChatListItem[];
  projectChats: ChatListItem[];
  projects: ProjectOption[];
  activeChat?: ActiveChat | null;
  initialProjectId?: string | null;
  initialMeetingId?: string | null;
  // All transcript segments for the current chat context (loaded server-side)
  transcriptSegments?: TranscriptSegmentData[];
}

const STARTER_QUESTIONS = [
  "What were the key decisions made in this meeting?",
  "Summarise the most important outcomes from this chat context.",
  "What action items are still unresolved?",
  "Were there any disagreements or risks discussed?",
];

function formatShortDate(value?: string) {
  if (!value) return "";

  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function renderAssistantContent(content: string) {
  const lines = content.split("\n");

  return lines.map((line, lineIndex) => {
    const parts = line.split(/(\*\*[^*]+\*\*)/g);

    return (
      <span key={`${lineIndex}-${line}`} className="block">
        {parts.map((part, partIndex) => {
          const isBold = /^\*\*[^*]+\*\*$/.test(part);

          if (isBold) {
            return (
              <strong
                key={`${lineIndex}-${partIndex}`}
                className="font-semibold text-white"
              >
                {part.slice(2, -2)}
              </strong>
            );
          }

          return <span key={`${lineIndex}-${partIndex}`}>{part}</span>;
        })}
      </span>
    );
  });
}

// ─── MessageBubble ────────────────────────────────────────────────────────────
function MessageBubble({
  msg,
  onViewSource,
}: {
  msg: Message;
  onViewSource: (refs: SegmentReference[]) => void;
}) {
  const [copied, setCopied] = useState(false);
  const isUser = msg.role === "user";
  const hasRefs = !isUser && (msg.references?.length ?? 0) > 0;

  const copy = async () => {
    await navigator.clipboard.writeText(msg.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={cn("group flex gap-3", isUser && "flex-row-reverse")}>
      {/* Avatar */}
      <div
        className={cn(
          "mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full",
          isUser
            ? "bg-[#26a269] text-[#041102] border border-[#26a269]/20"
            : "border border-[#26a269]/20 bg-[#0d1808] text-[#9fd8ad]",
        )}
      >
        {isUser ? "U" : <Bot size={14} />}
      </div>

      {/* Content */}
      <div
        className={cn(
          "flex max-w-[85%] flex-col gap-1.5",
          isUser && "items-end",
        )}
      >
        {/* Bubble */}
        <div
          className={cn(
            "whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm leading-relaxed",
            isUser
              ? "rounded-tr-sm bg-[#26a269]  text-[#041102]"
              : "rounded-tl-sm border-2 border-[#26a269]/30 bg-[#0a1406]/80 text-[#d5f5dc]",
          )}
        >
          {isUser ? msg.content : renderAssistantContent(msg.content)}
        </div>

        {/* Source reference chips */}
        {hasRefs && (
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] text-slate-600">Sources:</span>
            {msg.references!.map((ref, i) => (
              <button
                key={ref.segmentId}
                onClick={() => onViewSource(msg.references!)}
                title={`${ref.speaker}: "${ref.text.slice(0, 80)}…"`}
                className="flex items-center gap-1 rounded-full border border-[#26a269]/25 bg-[#0d1808] px-2.5 py-1 text-[11px] text-[#9fd8ad] transition-colors hover:border-[#26a269]/50 hover:bg-[#10200f] hover:text-white"
              >
                <Link2 size={9} />
                <span className="font-medium">{ref.speaker}</span>
                {ref.startTime && (
                  <span className="text-slate-600">{ref.startTime}</span>
                )}
              </button>
            ))}
          </div>
        )}

        {/* Copy button */}
        <button
          onClick={copy}
          className="flex items-center gap-1 px-1 text-xs text-slate-500 opacity-0 transition-opacity group-hover:opacity-100 hover:text-slate-300"
        >
          {copied ? (
            <>
              <Check size={11} className="text-emerald-400" /> Copied
            </>
          ) : (
            <>
              <Copy size={11} /> Copy
            </>
          )}
        </button>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function ChatWorkspace({
  meetingChats: initialMeetingChats,
  projectChats: initialProjectChats,
  projects,
  activeChat: initialActiveChat = null,
  initialProjectId = null,
  initialMeetingId = null,
  transcriptSegments = [],
}: Props) {
  const router = useRouter();
  const [meetingChats, setMeetingChats] = useState(initialMeetingChats);
  const [projectChats, setProjectChats] = useState(initialProjectChats);
  const [activeChat, setActiveChat] = useState<ActiveChat | null>(
    initialActiveChat,
  );
  const [messages, setMessages] = useState<Message[]>(
    initialActiveChat?.messages ?? [],
  );
  const [input, setInput] = useState("");
  const [scope, setScope] = useState<ChatScope>(
    initialMeetingId ? "MEETING" : "PROJECT",
  );
  const [selectedProjectId, setSelectedProjectId] = useState<string>(
    initialProjectId ?? projects[0]?.id ?? "",
  );
  const [selectedMeetingId, setSelectedMeetingId] = useState<string>(
    initialMeetingId ?? "",
  );
  const [creatingChat, setCreatingChat] = useState(false);
  const [sending, setSending] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);

  // Transcript panel state
  const [transcriptOpen, setTranscriptOpen] = useState(false);
  const [highlightSegmentIds, setHighlightSegmentIds] = useState<string[]>([]);

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setActiveChat(initialActiveChat);
    setMessages(initialActiveChat?.messages ?? []);
  }, [initialActiveChat]);

  const selectedProject = useMemo(
    () => projects.find((p) => p.id === selectedProjectId) ?? null,
    [projects, selectedProjectId],
  );

  useEffect(() => {
    if (!selectedProject && projects[0]) {
      setSelectedProjectId(projects[0].id);
      return;
    }
    if (
      scope === "MEETING" &&
      selectedProject &&
      selectedProject.meetings.length > 0 &&
      !selectedProject.meetings.some((m) => m.id === selectedMeetingId)
    ) {
      setSelectedMeetingId(selectedProject.meetings[0].id);
    }
  }, [projects, scope, selectedMeetingId, selectedProject]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending]);

  // Open transcript panel and scroll to referenced segments
  const handleViewSource = (refs: SegmentReference[]) => {
    setHighlightSegmentIds(refs.map((r) => r.segmentId));
    setTranscriptOpen(true);
  };

  const openNewChat = (nextScope: ChatScope) => {
    setScope(nextScope);
    setActiveChat(null);
    setMessages([]);
    router.push("/chat");
  };

  const refreshChats = useCallback(async () => {
    try {
      const [meetingRes, projectRes] = await Promise.all([
        fetch("/api/chats?scope=MEETING"),
        fetch("/api/chats?scope=PROJECT"),
      ]);
      const [meetingData, projectData] = await Promise.all([
        meetingRes.json(),
        projectRes.json(),
      ]);
      if (meetingData.success) setMeetingChats(meetingData.data);
      if (projectData.success) setProjectChats(projectData.data);
    } catch {
      toast.error("Failed to refresh chats");
    }
  }, []);

  const createChat = async () => {
    if (!selectedProjectId) {
      toast.error("Choose a project first");
      return;
    }
    if (scope === "MEETING" && !selectedMeetingId) {
      toast.error("Choose a meeting first");
      return;
    }

    setCreatingChat(true);
    try {
      const res = await fetch("/api/chats", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: selectedProjectId,
          meetingId: scope === "MEETING" ? selectedMeetingId : undefined,
          scope,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      await refreshChats();
      router.push(`/chat/${data.data.id}`);
      router.refresh();
    } catch (err: any) {
      toast.error(err.message ?? "Failed to create chat");
    } finally {
      setCreatingChat(false);
    }
  };

  const deleteChat = async (chatId: string) => {
    if (!confirm("Delete this chat and all its messages?")) return;
    setDeletingId(chatId);
    setMenuOpenId(null);
    try {
      const res = await fetch(`/api/chats/${chatId}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMeetingChats((prev) => prev.filter((c) => c.id !== chatId));
      setProjectChats((prev) => prev.filter((c) => c.id !== chatId));
      if (activeChat?.id === chatId) {
        setActiveChat(null);
        setMessages([]);
        router.push("/chat");
      }
      toast.success("Chat deleted");
    } catch (err: any) {
      toast.error(err.message ?? "Failed to delete chat");
    } finally {
      setDeletingId(null);
    }
  };

  const renameChat = async (chat: ChatListItem) => {
    const nextTitle = window.prompt("Rename chat", chat.title)?.trim();
    if (!nextTitle || nextTitle === chat.title) {
      setMenuOpenId(null);
      return;
    }

    try {
      const res = await fetch(`/api/chats/${chat.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: nextTitle }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setMeetingChats((prev) =>
        prev.map((item) =>
          item.id === chat.id ? { ...item, title: data.data.title } : item,
        ),
      );
      setProjectChats((prev) =>
        prev.map((item) =>
          item.id === chat.id ? { ...item, title: data.data.title } : item,
        ),
      );
      setActiveChat((prev) =>
        prev && prev.id === chat.id
          ? { ...prev, title: data.data.title }
          : prev,
      );
      setMenuOpenId(null);
      toast.success("Chat renamed");
    } catch (err: any) {
      toast.error(err.message ?? "Failed to rename chat");
    }
  };

  const sendMessage = async (preset?: string) => {
    const content = (preset ?? input).trim();
    if (!content || !activeChat || sending) return;

    const optimistic: Message = { role: "user", content };
    setInput("");
    setMessages((prev) => [...prev, optimistic]);
    setSending(true);

    try {
      const res = await fetch(`/api/chats/${activeChat.id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      // data.data now includes references[]
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data.data.content,
          references: data.data.references ?? [],
        },
      ]);
      await refreshChats();
    } catch (err: any) {
      toast.error(err.message ?? "Failed to send message");
      setMessages((prev) => prev.filter((m) => m !== optimistic));
      setInput(content);
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const renderChatList = (
    title: string,
    chats: ChatListItem[],
    type: ChatScope,
  ) => (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
            {title}
          </h3>
          <span className="rounded-full bg-[#0d1808] px-2 py-0.5 text-[11px] text-slate-500">
            {chats.length}
          </span>
        </div>
        <button
          onClick={() => openNewChat(type)}
          className="flex h-7 w-7 items-center justify-center rounded-md text-[#9fd8ad] transition-colors hover:border-[#26a269]/28 hover:bg-[#10200f] hover:text-white"
          title={`New ${type === "MEETING" ? "meeting" : "project"} chat`}
        >
          <Plus size={19} />
        </button>
      </div>
      <div className="space-y-2">
        {chats.length === 0 && (
          <div className="rounded-xl border border-slate-800 bg-[#0a1406]/60 px-3 py-2 text-xs text-slate-600">
            No {type === "MEETING" ? "meeting" : "project"} chats yet.
          </div>
        )}
        {chats.map((chat) => {
          const active = activeChat?.id === chat.id;
          const primaryLabel =
            type === "MEETING"
              ? (chat.contexts[0]?.meeting.title ?? "Meeting")
              : chat.project.name;
          const secondaryDate =
            type === "MEETING"
              ? formatShortDate(chat.contexts[0]?.meeting.createdAt)
              : formatShortDate(chat.createdAt);
          const subtitle = secondaryDate
            ? `${chat.project.name} · ${secondaryDate}`
            : chat.project.name;
          return (
            <div
              key={chat.id}
              className={cn(
                "group relative border px-3 py-3 transition-colors cursor-pointer",
                active
                  ? "border-[#26a269]/25 bg-[#0f1b0d]"
                  : "border-slate-800 bg-[#081004]/70 hover:border-[#26a269]/18 hover:bg-[#0d1808]",
              )}
              onClick={() => router.push(`/chat/${chat.id}`)}
            >
              <p
                className="max-w-[240px] truncate pr-8 text-sm font-medium text-white"
                title={primaryLabel}
              >
                {primaryLabel}
              </p>
              <p
                className="mt-1 truncate pr-8 text-xs text-slate-500"
                title={subtitle}
              >
                {subtitle}
              </p>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setMenuOpenId((current) =>
                    current === chat.id ? null : chat.id,
                  );
                }}
                className="absolute right-3 top-3 opacity-0 transition-opacity group-hover:opacity-100 hover:text-white text-slate-600"
              >
                <Ellipsis size={16} />
              </button>

              {menuOpenId === chat.id && (
                <div className="absolute right-3 top-10 z-20 min-w-[132px] border border-[#26a269]/15 bg-[#081004] p-1 shadow-xl">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      renameChat(chat);
                    }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-[#d5f5dc] hover:bg-[#10200f]"
                  >
                    <Pencil size={12} />
                    Rename
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteChat(chat.id);
                    }}
                    disabled={deletingId === chat.id}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-red-300 hover:bg-[#10200f] disabled:opacity-60"
                  >
                    {deletingId === chat.id ? (
                      <Loader2 size={12} className="animate-spin" />
                    ) : (
                      <Trash2 size={12} />
                    )}
                    Delete
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );

  const messagesLeft = activeChat ? 50 - messages.length : 50;
  const activeMeeting = activeChat?.contexts[0]?.meeting;
  const subtitleDate = activeMeeting?.createdAt ?? activeChat?.createdAt;
  const contextLabel = activeChat
    ? activeChat.scope === "PROJECT"
      ? activeChat.project.name
      : (activeMeeting?.title ?? "Meeting context")
    : "";

  return (
    <>
      <div className="flex min-h-screen bg-[#0a1406]">
        {/* Sidebar */}
        <aside
          className={cn(
            "flex min-h-screen flex-col overflow-x-hidden whitespace-nowrap border-r border-[#26a269]/10 bg-[#081004] transition-[width] duration-500 ease-in-out will-change-[width]",
            sidebarCollapsed ? "w-[72px]" : "w-[300px]",
          )}
        >
          <div
            className={cn(
              "px-2 py-4",
              sidebarCollapsed
                ? "flex justify-center"
                : "flex items-center justify-between",
            )}
          >
            <div
              className={cn(
                "min-w-0 items-center gap-3 overflow-hidden px-2",
                sidebarCollapsed ? "hidden" : "flex",
              )}
            >
              <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center" />
              <div className="overflow-hidden transition-[max-width,opacity,transform] duration-300 ease-out max-w-[180px] translate-x-0 opacity-100">
                <h1 className="text-xl font-semibold tracking-tight text-[#f3fff5]">
                  meeting<span className="font-bold">Hub</span>
                </h1>
              </div>
            </div>
            <button
              onClick={() => setSidebarCollapsed((v) => !v)}
              className="flex h-8 w-8 items-center justify-center rounded-md text-slate-500 transition-colors hover:bg-[#10200f] hover:text-white"
            >
              {sidebarCollapsed ? (
                <PanelLeftOpen size={19} />
              ) : (
                <PanelLeftClose size={19} />
              )}
            </button>
          </div>

          <div className="flex flex-1 flex-col px-2 py-4">
            <div className="space-y-1">
              <Link
                href="/dashboard"
                className="flex items-center gap-3 rounded-md px-2 py-2 text-[#9fd8ad] transition-colors hover:bg-[#10200f] hover:text-white"
                title="Home"
              >
                <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center">
                  <Home size={19} />
                </span>
                <span
                  className={cn(
                    "overflow-hidden text-sm transition-[max-width,opacity,transform] duration-300 ease-out",
                    sidebarCollapsed
                      ? "max-w-0 -translate-x-2 opacity-0"
                      : "max-w-[120px] translate-x-0 opacity-100",
                  )}
                >
                  Home
                </span>
              </Link>
              <Link
                href="/upload"
                className="flex items-center gap-3 rounded-md px-2 py-2 text-[#9fd8ad] transition-colors hover:bg-[#10200f] hover:text-white"
                title="Upload"
              >
                <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center">
                  <Upload size={19} />
                </span>
                <span
                  className={cn(
                    "overflow-hidden text-sm transition-[max-width,opacity,transform] duration-300 ease-out",
                    sidebarCollapsed
                      ? "max-w-0 -translate-x-2 opacity-0"
                      : "max-w-[120px] translate-x-0 opacity-100",
                  )}
                >
                  Upload
                </span>
              </Link>
              <Link
                href="/chat"
                className="flex items-center gap-3 rounded-md px-2 py-2 text-white transition-colors hover:bg-[#10200f]"
                title="Chat"
              >
                <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center">
                  <MessageSquare size={19} />
                </span>
                <span
                  className={cn(
                    "overflow-hidden text-sm transition-[max-width,opacity,transform] duration-300 ease-out",
                    sidebarCollapsed
                      ? "max-w-0 -translate-x-2 opacity-0"
                      : "max-w-[120px] translate-x-0 opacity-100",
                  )}
                >
                  Chat
                </span>
              </Link>
            </div>

            <div
              className={cn(
                "my-3 h-px bg-[#26a269]/10 transition-opacity duration-300",
                sidebarCollapsed ? "opacity-0" : "opacity-100",
              )}
            />

            {sidebarCollapsed ? (
              <div className="mt-auto flex justify-center pb-4">
                <UserButton afterSignOutUrl="/" />
              </div>
            ) : (
              <>
                <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6">
                  {renderChatList("Meeting Chats", meetingChats, "MEETING")}
                  {renderChatList("Project Chats", projectChats, "PROJECT")}
                </div>
                <div className="border-t border-[#26a269]/10 px-4 py-4">
                  <div className="flex items-center gap-3">
                    <UserButton afterSignOutUrl="/" />
                    <p className="text-xs text-slate-500">Account</p>
                  </div>
                </div>
              </>
            )}
          </div>
        </aside>

        {/* Main area */}
        <section className="min-h-screen flex-1 bg-[#0a1406]">
          {!activeChat ? (
            /* ── New chat screen ── */
            <div className="flex min-h-screen flex-col items-center justify-center px-6 py-12 text-center">
              <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl border border-[#26a269]/20 bg-[#0f1b0d] text-[#69FF97]">
                <MessageSquare size={24} />
              </div>
              <h1 className="text-3xl font-semibold tracking-[-0.04em] text-white">
                Start a new chat
              </h1>
              <p className="mt-3 max-w-xl text-sm leading-7 text-slate-400">
                Choose a focused meeting chat or a project-wide chat that
                searches all meetings at once.
              </p>
              <div className="mt-10 w-full max-w-xl  bg-[#0a1406]/80 p-6 text-left">
                <div className="grid gap-3 sm:grid-cols-2">
                  {(["MEETING", "PROJECT"] as const).map((option) => (
                    <button
                      key={option}
                      onClick={() => setScope(option)}
                      className={cn(
                        "border px-4 py-4 transition-colors text-left",
                        scope === option
                          ? "border-[#26a269]/30 bg-[#10200f]"
                          : "border-slate-800 bg-[#081004] hover:border-[#26a269]/16",
                      )}
                    >
                      <p className="text-sm font-medium text-white">
                        {option === "MEETING" ? "Meeting chat" : "Project chat"}
                      </p>
                      <p className="mt-1 text-xs leading-5 text-slate-500">
                        {option === "MEETING"
                          ? "Search one meeting transcript."
                          : "Search every meeting in the project."}
                      </p>
                    </button>
                  ))}
                </div>
                <div className="mt-5 space-y-4">
                  <div>
                    <label className="mb-2 block text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
                      Project
                    </label>
                    <select
                      value={selectedProjectId}
                      onChange={(e) => setSelectedProjectId(e.target.value)}
                      className="w-full rounded-lg bg-[#10200f] px-4 py-3 text-sm text-white outline-none focus:border-[#26a269]"
                    >
                      {projects.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  {scope === "MEETING" && (
                    <div>
                      <label className="mb-2 block text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
                        Meeting
                      </label>
                      <select
                        value={selectedMeetingId}
                        onChange={(e) => setSelectedMeetingId(e.target.value)}
                        className="w-full rounded-lg bg-[#10200f] px-4 py-3 text-sm text-white outline-none focus:border-[#26a269]"
                      >
                        {(selectedProject?.meetings ?? []).map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.title}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
                <button
                  onClick={createChat}
                  disabled={
                    creatingChat ||
                    !selectedProjectId ||
                    (scope === "MEETING" && !selectedMeetingId)
                  }
                  className="mt-6 rounded-2xl mx-auto flex items-center gap-2 plasma-button plasma-button-secondary px-5 py-3 text-sm font-medium text-[#041102]  disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
                >
                  {creatingChat ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Plus size={14} />
                  )}
                  Create {scope === "MEETING" ? "meeting" : "project"} chat
                </button>
              </div>
            </div>
          ) : (
            /* ── Active chat ── */
            <div className="flex h-screen min-h-screen flex-col">
              {/* Chat header */}
              <div className="sticky top-0 z-20 border-b border-[#26a269]/10 bg-[#0a1406]/92 backdrop-blur-xl">
                <div className="mx-auto flex w-full max-w-4xl items-center justify-between gap-4 px-6 py-4">
                  <div className="min-w-0">
                    <h1 className="truncate text-base font-medium text-white">
                      {activeChat.title}
                    </h1>
                    <p className="truncate text-xs text-slate-500">
                      {contextLabel}
                      {subtitleDate ? ` · ${formatDate(subtitleDate)}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="rounded-full bg-[#0d1808] px-3 py-1 text-xs text-slate-500">
                      {messagesLeft} left
                    </span>
                    {/* Transcript toggle button */}
                    {transcriptSegments.length > 0 && (
                      <button
                        onClick={() => {
                          setHighlightSegmentIds([]);
                          setTranscriptOpen((v) => !v);
                        }}
                        className={cn(
                          "flex h-8 w-8 items-center justify-center rounded-lg border transition-colors",
                          transcriptOpen
                            ? "border-[#26a269]/40 bg-[#10200f] text-[#9fd8ad]"
                            : "border-slate-700 text-slate-500 hover:border-[#26a269]/30 hover:text-[#9fd8ad]",
                        )}
                        title="Transcript"
                      >
                        <FileText size={16} />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto">
                <div className="mx-auto w-full max-w-4xl space-y-5 px-6 py-6">
                  {messages.length === 0 && !sending && (
                    <div className="flex h-full flex-col items-center justify-center py-8 text-center">
                      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-[#26a269]/20 bg-[#0f1b0d] text-[#69FF97]">
                        <Bot size={18} />
                      </div>
                      <p className="text-sm font-medium text-white">
                        Ask anything about this context
                      </p>
                      <p className="mt-1 max-w-sm text-xs leading-6 text-slate-500">
                        Gemini will search the linked transcripts and cite its
                        sources.
                      </p>
                      <div className="mt-6 w-full max-w-xl space-y-2">
                        {STARTER_QUESTIONS.map((q) => (
                          <button
                            key={q}
                            onClick={() => sendMessage(q)}
                            className="w-full border border-[#26a269]/14 bg-[#0a1406] px-4 py-3 text-left text-sm text-[#d5f5dc] transition-colors hover:border-[#26a269]/28 hover:bg-[#0f1b0d]"
                          >
                            {q}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {messages.map((msg, i) => (
                    <MessageBubble
                      key={msg.id ?? i}
                      msg={msg}
                      onViewSource={handleViewSource}
                    />
                  ))}

                  {sending && (
                    <div className="flex gap-3">
                      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border border-[#26a269]/20 bg-[#0d1808] text-[#9fd8ad]">
                        <Bot size={14} />
                      </div>
                      <div className="border border-[#26a269]/14 bg-[#0a1406]/80 px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          {[0, 1, 2].map((i) => (
                            <div
                              key={i}
                              className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-500"
                              style={{ animationDelay: `${i * 0.15}s` }}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {messagesLeft === 0 && (
                    <div className="flex items-center gap-2 border border-amber-700/30 bg-amber-900/20 px-4 py-3 text-xs text-amber-400">
                      <AlertCircle size={13} />
                      Message limit reached. Start a new chat to continue.
                    </div>
                  )}

                  <div ref={bottomRef} />
                </div>
              </div>

              {/* Input */}
              <div className="sticky bottom-2 z-20 bg-[#0a1406]/94 backdrop-blur-xl">
                <div className="mx-auto w-full max-w-4xl border rounded-2xl border-[#26a269]/18  bg-[#0d1808] mb-4">
                  <div className="flex items-end">
                    <textarea
                      ref={inputRef}
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="Ask a question… (Enter to send, Shift+Enter for new line)"
                      disabled={sending || messagesLeft === 0}
                      rows={1}
                      className="max-h-[120px] min-h-[44px] flex-1 rounded-2xl resize-none  overflow-y-auto  bg-[#0d1808] px-4 py-3 text-sm text-white outline-none transition-colors placeholder:text-slate-600 focus:border-[#26a269] disabled:opacity-50"
                      onInput={(e) => {
                        const el = e.currentTarget;
                        el.style.height = "auto";
                        el.style.height = Math.min(el.scrollHeight, 120) + "px";
                      }}
                    />
                    <button
                      onClick={() => sendMessage()}
                      disabled={!input.trim() || sending || messagesLeft === 0}
                      className="flex h-9 w-9 mb-1 mr-1 rounded-xl items-center justify-center bg-[#26a269] transition-colors hover:bg-[#30bb77] disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {sending ? (
                        <Loader2
                          size={17}
                          className="animate-spin text-[#041102]"
                        />
                      ) : (
                        <Send size={17} className="text-[#041102]" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>
      </div>

      {/* Transcript panel — right sliding sidebar */}
      <TranscriptPanel
        isOpen={transcriptOpen}
        onClose={() => setTranscriptOpen(false)}
        segments={transcriptSegments}
        highlightIds={highlightSegmentIds}
      />
    </>
  );
}
