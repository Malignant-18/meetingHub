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
      <button
        onClick={handleRun}
        disabled={loading}
        className="plasma-button plasma-button-outline inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-medium text-white transition-transform hover:scale-[1.01] disabled:opacity-50"
      >
        {loading ? (
          <Loader2 size={15} className="animate-spin" />
        ) : (
          <RefreshCw size={15} />
        )}
        Re-analyze sentiment
      </button>
    );
  }

  return (
    <button
      onClick={handleRun}
      disabled={loading}
      className="plasma-button plasma-button-secondary inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-medium text-[#041102] transition-transform hover:scale-[1.01] disabled:opacity-60 disabled:cursor-not-allowed"
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
