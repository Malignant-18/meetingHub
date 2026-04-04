"use client";
// components/SentimentButton.tsx
// Triggers POST /api/sentiment, refreshes the page when done

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { BarChart2, Loader2, RefreshCw, CheckCircle } from "lucide-react";

interface Props {
  meetingId: string;
  hasResults: boolean;
}

export default function SentimentButton({ meetingId, hasResults }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleRun = async () => {
    setLoading(true);
    const toastId = toast.loading(
      "Sending transcript to Gemini for sentiment analysis…",
      {
        style: {
          background: "#1e1c32",
          color: "#e0e7ff",
          border: "1px solid #4338ca",
          borderRadius: "10px",
        },
      },
    );

    try {
      const res = await fetch("/api/sentiment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ meetingId }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Sentiment analysis failed");

      toast.success(
        `Sentiment analysis complete — ${data.data.length} data point${data.data.length !== 1 ? "s" : ""} found.`,
        { id: toastId, duration: 5000 },
      );
      router.refresh();
    } catch (err: any) {
      toast.error(err.message ?? "Something went wrong", { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  if (hasResults) {
    return (
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5 text-sm text-emerald-400">
          <CheckCircle size={14} />
          Sentiment analyzed
        </div>
        <button
          onClick={handleRun}
          disabled={loading}
          className="flex items-center gap-2 border border-slate-600 hover:border-purple-500 text-slate-300 hover:text-white text-sm px-4 py-2 rounded-xl transition-all disabled:opacity-50"
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

  return (
    <button
      onClick={handleRun}
      disabled={loading}
      className="flex items-center gap-2 bg-purple-700 hover:bg-purple-600 disabled:opacity-60 disabled:cursor-not-allowed text-white font-medium px-5 py-2.5 rounded-xl transition-colors shadow-lg shadow-purple-900/40"
    >
      {loading ? (
        <>
          <Loader2 size={15} className="animate-spin" /> Analyzing…
        </>
      ) : (
        <>
          <BarChart2 size={15} /> Sentiment Analysis
        </>
      )}
    </button>
  );
}
