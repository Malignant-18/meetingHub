// components/TranscriptViewer.tsx
// Scrollable transcript with color-coded speakers and timestamps
// Client component for search/filter functionality

"use client";

import { useState, useMemo } from "react";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface Segment {
  id: string;
  speaker: string;
  text: string;
  startTime: string | null;
  sequence: number;
}

interface Props {
  segments: Segment[];
}

// Generate a consistent color per speaker name
const SPEAKER_COLORS = [
  {
    bg: "bg-indigo-900/50",
    border: "border-indigo-700/50",
    text: "text-indigo-300",
    dot: "bg-indigo-500",
  },
  {
    bg: "bg-purple-900/50",
    border: "border-purple-700/50",
    text: "text-purple-300",
    dot: "bg-purple-500",
  },
  {
    bg: "bg-emerald-900/50",
    border: "border-emerald-700/50",
    text: "text-emerald-300",
    dot: "bg-emerald-500",
  },
  {
    bg: "bg-amber-900/50",
    border: "border-amber-700/50",
    text: "text-amber-300",
    dot: "bg-amber-500",
  },
  {
    bg: "bg-rose-900/50",
    border: "border-rose-700/50",
    text: "text-rose-300",
    dot: "bg-rose-500",
  },
  {
    bg: "bg-cyan-900/50",
    border: "border-cyan-700/50",
    text: "text-cyan-300",
    dot: "bg-cyan-500",
  },
];

export default function TranscriptViewer({ segments }: Props) {
  const [search, setSearch] = useState("");

  // Assign a color index to each unique speaker
  const speakerColorMap = useMemo(() => {
    const map: Record<string, number> = {};
    let idx = 0;
    for (const seg of segments) {
      if (!(seg.speaker in map)) {
        map[seg.speaker] = idx % SPEAKER_COLORS.length;
        idx++;
      }
    }
    return map;
  }, [segments]);

  const filtered = useMemo(() => {
    if (!search.trim()) return segments;
    const q = search.toLowerCase();
    return segments.filter(
      (s) =>
        s.text.toLowerCase().includes(q) || s.speaker.toLowerCase().includes(q),
    );
  }, [segments, search]);

  // Highlight matching text
  const highlight = (text: string) => {
    if (!search.trim()) return text;
    const parts = text.split(new RegExp(`(${search.trim()})`, "gi"));
    return parts
      .map((part, i) =>
        part.toLowerCase() === search.toLowerCase()
          ? `<mark class="bg-indigo-500/40 text-white rounded px-0.5">${part}</mark>`
          : part,
      )
      .join("");
  };

  if (segments.length === 0) {
    return (
      <div className="p-6 text-center text-slate-500 text-sm">
        No transcript segments found.
      </div>
    );
  }

  return (
    <div className="flex flex-col" style={{ maxHeight: "70vh" }}>
      {/* Search */}
      <div className="px-4 py-3 border-b border-slate-700/50">
        <div className="relative">
          <Search
            size={13}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
          />
          <input
            type="text"
            placeholder="Search transcript…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[#2d2a4a] border border-slate-600 text-white placeholder-slate-600 rounded-lg pl-8 pr-8 py-1.5 text-xs focus:outline-none focus:border-indigo-500"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
            >
              <X size={12} />
            </button>
          )}
        </div>
        {search && (
          <p className="text-xs text-slate-500 mt-1.5">
            {filtered.length} result{filtered.length !== 1 ? "s" : ""} for "
            {search}"
          </p>
        )}
      </div>

      {/* Segments */}
      <div className="overflow-y-auto flex-1 divide-y divide-slate-700/30">
        {filtered.length === 0 && (
          <div className="p-6 text-center text-slate-500 text-sm">
            No results found.
          </div>
        )}

        {filtered.map((seg) => {
          const colorIdx = speakerColorMap[seg.speaker] ?? 0;
          const color = SPEAKER_COLORS[colorIdx];

          return (
            <div
              key={seg.id}
              className="px-4 py-3 hover:bg-white/[0.02] transition-colors"
            >
              {/* Speaker row */}
              <div className="flex items-center gap-2 mb-1.5">
                <span
                  className={cn(
                    "w-1.5 h-1.5 rounded-full flex-shrink-0",
                    color.dot,
                  )}
                />
                <span
                  className={cn(
                    "text-xs font-semibold uppercase tracking-wide",
                    color.text,
                  )}
                >
                  {seg.speaker}
                </span>
                {seg.startTime && (
                  <span className="ml-auto text-xs text-slate-600 font-mono">
                    {seg.startTime}
                  </span>
                )}
              </div>

              {/* Text */}
              <p
                className="text-slate-300 text-xs leading-relaxed"
                dangerouslySetInnerHTML={{ __html: highlight(seg.text) }}
              />
            </div>
          );
        })}
      </div>

      {/* Footer count */}
      <div className="px-4 py-2.5 border-t border-slate-700/50 text-xs text-slate-600 text-center">
        {segments.length} segments · {Object.keys(speakerColorMap).length}{" "}
        speakers
      </div>
    </div>
  );
}
