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

    const toastId = toast.loading("Sending transcript to Gemini…");

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
      <button
        onClick={handleAnalyze}
        disabled={loading}
        className="plasma-button plasma-button-outline inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-medium text-white transition-transform hover:scale-[1.01] disabled:opacity-50"
      >
        {loading ? (
          <Loader2 size={15} className="animate-spin" />
        ) : (
          <RefreshCw size={15} />
        )}
        Re-analyze
      </button>
    );
  }

  // Not yet analyzed
  return (
    <button
      onClick={handleAnalyze}
      disabled={loading}
      className="plasma-button plasma-button-secondary inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-medium text-[#041102] transition-transform hover:scale-[1.01] disabled:opacity-60 disabled:cursor-not-allowed"
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
