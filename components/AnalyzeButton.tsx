// components/AnalyzeButton.tsx
// Client component — triggers /api/analyze, shows progress, auto-refreshes page on completion

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Sparkles, Loader2, RefreshCw, CheckCircle } from "lucide-react";

interface Props {
  meetingId: string;
  isAnalyzed: boolean;
}

export default function AnalyzeButton({ meetingId, isAnalyzed }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [phase, setPhase] = useState<"idle" | "sending" | "waiting" | "done">(
    "idle",
  );

  const handleAnalyze = async () => {
    setLoading(true);
    setPhase("sending");

    const toastId = toast.loading("Sending transcript to Gemini…", {
      style: {
        background: "#1e1c32",
        color: "#e0e7ff",
        border: "1px solid #4338ca",
        borderRadius: "10px",
      },
    });

    try {
      setPhase("waiting");
      toast.loading("Gemini is extracting decisions and action items…", {
        id: toastId,
      });

      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ meetingId }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error ?? "Analysis failed");
      }

      const { decisions, action_items } = data.data;

      setPhase("done");
      toast.success(
        `Done! Found ${decisions.length} decision${decisions.length !== 1 ? "s" : ""} and ${action_items.length} action item${action_items.length !== 1 ? "s" : ""}.`,
        { id: toastId, duration: 5000 },
      );

      // Refresh server components to show new data
      router.refresh();
    } catch (err: any) {
      toast.error(err.message ?? "Something went wrong", { id: toastId });
      setPhase("idle");
    } finally {
      setLoading(false);
    }
  };

  // Already analyzed — show re-run option
  if (isAnalyzed) {
    return (
      <div className="flex items-center gap-3 flex-shrink-0">
        <div className="flex items-center gap-1.5 text-sm text-emerald-400">
          <CheckCircle size={14} />
          Analysis complete
        </div>
        <button
          onClick={handleAnalyze}
          disabled={loading}
          className="flex items-center gap-2 border border-slate-600 hover:border-indigo-500 text-slate-300 hover:text-white text-sm px-4 py-2 rounded-xl transition-all disabled:opacity-50"
        >
          {loading ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <RefreshCw size={14} />
          )}
          Re-analyze
        </button>
      </div>
    );
  }

  // Not yet analyzed
  return (
    <button
      onClick={handleAnalyze}
      disabled={loading}
      className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed text-white font-medium px-5 py-2.5 rounded-xl transition-colors flex-shrink-0 shadow-lg shadow-indigo-900/40"
    >
      {loading ? (
        <>
          <Loader2 size={15} className="animate-spin" />
          {phase === "sending" ? "Sending…" : "Analyzing…"}
        </>
      ) : (
        <>
          <Sparkles size={15} />
          Run AI Analysis
        </>
      )}
    </button>
  );
}
