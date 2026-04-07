"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Loader2, RotateCcw } from "lucide-react";

interface Props {
  meetingId: string;
}

export default function ResetMeetingAIButton({ meetingId }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleReset = async () => {
    const confirmed = window.confirm(
      "Delete all stored AI analysis for this meeting? This removes decisions, action items, and sentiment results.",
    );
    if (!confirmed) return;

    setLoading(true);
    const toastId = toast.loading("Resetting meeting AI data…");

    try {
      const res = await fetch(`/api/meetings/${meetingId}/reset-ai`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Reset failed");

      toast.success("AI data cleared. You can run analysis again.", {
        id: toastId,
      });
      router.refresh();
    } catch (err: any) {
      toast.error(err.message ?? "Failed to reset AI data", { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleReset}
      disabled={loading}
      className="inline-flex items-center gap-2 rounded-full border border-red-500/25 bg-red-500/8 px-5 py-3 text-sm font-medium text-red-200 transition-colors hover:border-red-400/40 hover:bg-red-500/12 disabled:opacity-50"
    >
      {loading ? (
        <Loader2 size={15} className="animate-spin" />
      ) : (
        <RotateCcw size={15} />
      )}
      Reset AI Data
    </button>
  );
}
