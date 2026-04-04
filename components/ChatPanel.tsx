"use client";
// components/ChatPanel.tsx
// Full chat UI — two internal views:
//   LIST VIEW  — shows existing chats for this meeting, create button
//   CHAT VIEW  — active conversation with Gemini, input, copy, delete

import { useState, useEffect, useRef, useCallback } from "react";
import toast from "react-hot-toast";
import {
  MessageSquare,
  Plus,
  ArrowLeft,
  Send,
  Loader2,
  Trash2,
  Copy,
  Check,
  Bot,
  User,
  AlertCircle,
} from "lucide-react";
import { cn, formatDate } from "@/lib/utils";

// ─── Types ───────────────────────────────────────────────────────────────────
interface ChatContext {
  meetingId: string;
  meeting: { id: string; title: string; fileName: string };
}

interface Chat {
  id: string;
  title: string;
  scope: "MEETING" | "PROJECT";
  createdAt: string;
  updatedAt: string;
  _count: { messages: number };
  contexts: ChatContext[];
}

interface Message {
  id?: string;
  role: "user" | "assistant";
  content: string;
  createdAt?: string;
}

interface Props {
  meetingId: string;
  projectId: string;
  meetingFileName: string;
}

// ─── Suggested starter questions ─────────────────────────────────────────────
const STARTER_QUESTIONS = [
  "What were the key decisions made in this meeting?",
  "Who is responsible for the most action items?",
  "Were there any unresolved concerns or disagreements?",
  "Summarise this meeting in 5 bullet points.",
];

// ─── Helpers ─────────────────────────────────────────────────────────────────
function MessageBubble({ msg }: { msg: Message }) {
  const [copied, setCopied] = useState(false);
  const isUser = msg.role === "user";

  const copy = async () => {
    await navigator.clipboard.writeText(msg.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={cn("flex gap-3 group", isUser && "flex-row-reverse")}>
      {/* Avatar */}
      <div
        className={cn(
          "w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5",
          isUser
            ? "bg-indigo-600"
            : "bg-purple-900 border border-purple-700/50",
        )}
      >
        {isUser ? (
          <User size={13} className="text-white" />
        ) : (
          <Bot size={13} className="text-purple-300" />
        )}
      </div>

      {/* Bubble */}
      <div
        className={cn("flex flex-col gap-1 max-w-[85%]", isUser && "items-end")}
      >
        <div
          className={cn(
            "rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap",
            isUser
              ? "bg-indigo-600 text-white rounded-tr-sm"
              : "bg-[#252340] text-slate-200 border border-slate-700/50 rounded-tl-sm",
          )}
        >
          {msg.content}
        </div>

        {/* Copy button — appears on hover */}
        <button
          onClick={copy}
          className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 text-xs text-slate-500 hover:text-slate-300 px-1"
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
export default function ChatPanel({
  meetingId,
  projectId,
  meetingFileName,
}: Props) {
  const [view, setView] = useState<"list" | "chat">("list");
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeChat, setActiveChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loadingChats, setLoadingChats] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [creatingChat, setCreatingChat] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // ── Fetch chat list ─────────────────────────────────────────────────────
  const fetchChats = useCallback(async () => {
    setLoadingChats(true);
    try {
      const res = await fetch(`/api/chats?meetingId=${meetingId}`);
      const data = await res.json();
      if (data.success) setChats(data.data);
    } catch {
      toast.error("Failed to load chats");
    } finally {
      setLoadingChats(false);
    }
  }, [meetingId]);

  useEffect(() => {
    fetchChats();
  }, [fetchChats]);

  // ── Auto-scroll on new messages ─────────────────────────────────────────
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending]);

  // ── Open a chat ─────────────────────────────────────────────────────────
  const openChat = async (chat: Chat) => {
    setActiveChat(chat);
    setView("chat");
    setLoadingMessages(true);
    setMessages([]);
    try {
      const res = await fetch(`/api/chats/${chat.id}`);
      const data = await res.json();
      if (data.success) setMessages(data.data.messages);
    } catch {
      toast.error("Failed to load messages");
    } finally {
      setLoadingMessages(false);
    }
  };

  // ── Create new chat ─────────────────────────────────────────────────────
  const createChat = async (scope: "MEETING" | "PROJECT") => {
    setCreatingChat(true);
    try {
      const res = await fetch("/api/chats", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, meetingId, scope }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      await fetchChats();
      openChat(data.data);
    } catch (err: any) {
      toast.error(err.message ?? "Failed to create chat");
    } finally {
      setCreatingChat(false);
    }
  };

  // ── Delete a chat ───────────────────────────────────────────────────────
  const deleteChat = async (chatId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Delete this chat and all its messages?")) return;
    setDeletingId(chatId);
    try {
      const res = await fetch(`/api/chats/${chatId}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setChats((prev) => prev.filter((c) => c.id !== chatId));
      if (activeChat?.id === chatId) {
        setView("list");
        setActiveChat(null);
      }
      toast.success("Chat deleted");
    } catch (err: any) {
      toast.error(err.message ?? "Failed to delete chat");
    } finally {
      setDeletingId(null);
    }
  };

  // ── Send message ────────────────────────────────────────────────────────
  const sendMessage = async (text?: string) => {
    const content = (text ?? input).trim();
    if (!content || !activeChat || sending) return;
    setInput("");
    setSending(true);

    // Optimistic user message
    const userMsg: Message = { role: "user", content };
    setMessages((prev) => [...prev, userMsg]);

    try {
      const res = await fetch(`/api/chats/${activeChat.id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.data.content },
      ]);

      // Update chat title in list if it was the first message
      setChats((prev) =>
        prev.map((c) =>
          c.id === activeChat.id
            ? { ...c, _count: { messages: c._count.messages + 2 } }
            : c,
        ),
      );

      // Re-fetch chats to get updated title
      fetchChats();
    } catch (err: any) {
      toast.error(err.message ?? "Failed to send message");
      // Remove optimistic message on failure
      setMessages((prev) => prev.filter((m) => m !== userMsg));
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

  // ── Context pill label ──────────────────────────────────────────────────
  const contextLabel = activeChat
    ? activeChat.scope === "PROJECT"
      ? "All meetings in project"
      : activeChat.contexts.map((c) => c.meeting.fileName).join(", ")
    : "";

  // ── Remaining messages ──────────────────────────────────────────────────
  const messagesLeft = activeChat ? 50 - messages.length : 50;

  // ══════════════════════════════════════════════════════════════════════════
  // LIST VIEW
  // ══════════════════════════════════════════════════════════════════════════
  if (view === "list") {
    return (
      <div className="bg-[#1e1c32] border border-slate-700/50 rounded-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700/50">
          <div className="flex items-center gap-2">
            <MessageSquare size={15} className="text-indigo-400" />
            <h2 className="font-medium text-white text-sm">Chats</h2>
            <span className="text-xs text-slate-500 bg-slate-800 px-2 py-0.5 rounded-full">
              {chats.length}/5
            </span>
          </div>
        </div>

        {/* Create buttons */}
        <div className="px-5 py-4 border-b border-slate-700/50 flex gap-3">
          <button
            onClick={() => createChat("MEETING")}
            disabled={creatingChat || chats.length >= 5}
            className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium px-4 py-2.5 rounded-xl transition-colors"
          >
            {creatingChat ? (
              <Loader2 size={13} className="animate-spin" />
            ) : (
              <Plus size={13} />
            )}
            Chat about this meeting
          </button>
          <button
            onClick={() => createChat("PROJECT")}
            disabled={creatingChat || chats.length >= 5}
            className="flex-1 flex items-center justify-center gap-2 border border-slate-600 hover:border-indigo-500 text-slate-300 hover:text-white text-sm px-4 py-2.5 rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {creatingChat ? (
              <Loader2 size={13} className="animate-spin" />
            ) : (
              <Plus size={13} />
            )}
            Chat about whole project
          </button>
        </div>

        {/* Chat list */}
        <div className="divide-y divide-slate-700/30">
          {loadingChats && (
            <div className="flex items-center justify-center py-10">
              <Loader2 size={18} className="animate-spin text-slate-500" />
            </div>
          )}

          {!loadingChats && chats.length === 0 && (
            <div className="py-10 text-center">
              <MessageSquare
                size={24}
                className="text-slate-700 mx-auto mb-2"
              />
              <p className="text-slate-500 text-sm">No chats yet</p>
              <p className="text-slate-600 text-xs mt-1">
                Create one above to start asking questions
              </p>
            </div>
          )}

          {chats.map((chat) => (
            <div
              key={chat.id}
              onClick={() => openChat(chat)}
              className="flex items-center gap-3 px-5 py-4 hover:bg-white/[0.02] cursor-pointer transition-colors group"
            >
              {/* Scope icon */}
              <div
                className={cn(
                  "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0",
                  chat.scope === "PROJECT"
                    ? "bg-purple-900/50 border border-purple-700/30"
                    : "bg-indigo-900/50 border border-indigo-700/30",
                )}
              >
                <MessageSquare
                  size={13}
                  className={
                    chat.scope === "PROJECT"
                      ? "text-purple-400"
                      : "text-indigo-400"
                  }
                />
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">
                  {chat.title}
                </p>
                <div className="flex items-center gap-3 mt-0.5">
                  <span className="text-xs text-slate-500">
                    {chat._count.messages} message
                    {chat._count.messages !== 1 ? "s" : ""}
                  </span>
                  <span
                    className={cn(
                      "text-xs px-1.5 py-0.5 rounded-full",
                      chat.scope === "PROJECT"
                        ? "bg-purple-900/50 text-purple-400"
                        : "bg-indigo-900/50 text-indigo-400",
                    )}
                  >
                    {chat.scope === "PROJECT" ? "Project-wide" : "Meeting"}
                  </span>
                </div>
              </div>

              {/* Delete */}
              <button
                onClick={(e) => deleteChat(chat.id, e)}
                disabled={deletingId === chat.id}
                className="opacity-0 group-hover:opacity-100 text-slate-600 hover:text-red-400 transition-all p-1 flex-shrink-0"
              >
                {deletingId === chat.id ? (
                  <Loader2 size={13} className="animate-spin" />
                ) : (
                  <Trash2 size={13} />
                )}
              </button>
            </div>
          ))}
        </div>

        {chats.length >= 5 && (
          <div className="px-5 py-3 border-t border-slate-700/30 flex items-center gap-2 text-xs text-amber-400">
            <AlertCircle size={12} />
            Chat limit reached — delete a chat to create a new one
          </div>
        )}
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // CHAT VIEW
  // ══════════════════════════════════════════════════════════════════════════
  return (
    <div
      className="bg-[#1e1c32] border border-slate-700/50 rounded-2xl overflow-hidden flex flex-col"
      style={{ height: "600px" }}
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-700/50 flex-shrink-0">
        <button
          onClick={() => {
            setView("list");
            setActiveChat(null);
            setMessages([]);
          }}
          className="text-slate-500 hover:text-white transition-colors p-1 rounded-lg hover:bg-slate-800"
        >
          <ArrowLeft size={15} />
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-white truncate">
            {activeChat?.title}
          </p>
          <p className="text-xs text-slate-500 truncate" title={contextLabel}>
            Searching: {contextLabel}
          </p>
        </div>
        {/* Message count */}
        <span
          className={cn(
            "text-xs px-2 py-0.5 rounded-full flex-shrink-0",
            messagesLeft <= 10
              ? "bg-amber-900/50 text-amber-400"
              : "bg-slate-800 text-slate-500",
          )}
        >
          {messagesLeft} left
        </span>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {loadingMessages && (
          <div className="flex items-center justify-center h-full">
            <Loader2 size={20} className="animate-spin text-slate-500" />
          </div>
        )}

        {/* Empty state — show starter questions */}
        {!loadingMessages && messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center py-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-600/10 border border-indigo-600/20 flex items-center justify-center mb-3">
              <Bot size={20} className="text-indigo-400" />
            </div>
            <p className="text-white font-medium text-sm mb-1">
              Ask anything about this meeting
            </p>
            <p className="text-slate-500 text-xs mb-5 max-w-xs">
              Gemini will search the transcript and cite its sources
            </p>
            <div className="space-y-2 w-full max-w-sm">
              {STARTER_QUESTIONS.map((q) => (
                <button
                  key={q}
                  onClick={() => sendMessage(q)}
                  className="w-full text-left text-xs text-slate-300 bg-[#252340] hover:bg-[#2d2a4a] border border-slate-700/50 hover:border-indigo-500/40 rounded-xl px-4 py-2.5 transition-all"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Message bubbles */}
        {!loadingMessages &&
          messages.map((msg, i) => (
            <MessageBubble key={msg.id ?? i} msg={msg} />
          ))}

        {/* Typing indicator */}
        {sending && (
          <div className="flex gap-3">
            <div className="w-7 h-7 rounded-full bg-purple-900 border border-purple-700/50 flex items-center justify-center flex-shrink-0 mt-0.5">
              <Bot size={13} className="text-purple-300" />
            </div>
            <div className="bg-[#252340] border border-slate-700/50 rounded-2xl rounded-tl-sm px-4 py-3">
              <div className="flex items-center gap-1.5">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="w-1.5 h-1.5 rounded-full bg-slate-500 animate-bounce"
                    style={{ animationDelay: `${i * 0.15}s` }}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Limit hit message */}
        {messagesLeft === 0 && (
          <div className="flex items-center gap-2 text-xs text-amber-400 bg-amber-900/20 border border-amber-700/30 rounded-xl px-4 py-3">
            <AlertCircle size={13} />
            Message limit reached. Start a new chat to continue.
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <div className="border-t border-slate-700/50 px-4 py-3 flex-shrink-0">
        <div className="flex items-end gap-3">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask a question… (Enter to send, Shift+Enter for new line)"
            disabled={sending || messagesLeft === 0}
            rows={1}
            className="flex-1 bg-[#2d2a4a] border border-slate-600 focus:border-indigo-500 text-white placeholder-slate-600 rounded-xl px-4 py-2.5 text-sm resize-none focus:outline-none transition-colors disabled:opacity-50"
            style={{ maxHeight: "120px", minHeight: "42px", overflowY: "auto" }}
            onInput={(e) => {
              const el = e.currentTarget;
              el.style.height = "auto";
              el.style.height = Math.min(el.scrollHeight, 120) + "px";
            }}
          />
          <button
            onClick={() => sendMessage()}
            disabled={!input.trim() || sending || messagesLeft === 0}
            className="w-10 h-10 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center flex-shrink-0 transition-colors"
          >
            {sending ? (
              <Loader2 size={15} className="animate-spin text-white" />
            ) : (
              <Send size={15} className="text-white" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
