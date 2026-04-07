//components/TranscriptPanel.tsx
"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import { X, Search, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

export interface TranscriptSegmentData {
  id: string;
  speaker: string;
  text: string;
  startTime: string | null;
  meetingFileName: string;
  meetingTitle: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  segments: TranscriptSegmentData[];
  highlightIds?: string[];
}

const SPEAKER_NAME_COLOR = "text-[#12375c]";

export default function TranscriptPanel({
  isOpen,
  onClose,
  segments,
  highlightIds = [],
}: Props) {
  const [search, setSearch] = useState("");
  const panelRef = useRef<HTMLDivElement>(null);
  const highlightTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Search filter
  const filtered = useMemo(() => {
    if (!search.trim()) return segments;
    const q = search.toLowerCase();

    return segments.filter(
      (s) =>
        s.text.toLowerCase().includes(q) || s.speaker.toLowerCase().includes(q),
    );
  }, [segments, search]);

  // Group meetings
  const grouped = useMemo(() => {
    const groups: {
      file: string;
      title: string;
      segs: TranscriptSegmentData[];
    }[] = [];

    for (const seg of filtered) {
      const last = groups[groups.length - 1];

      if (!last || last.file !== seg.meetingFileName) {
        groups.push({
          file: seg.meetingFileName,
          title: seg.meetingTitle,
          segs: [seg],
        });
      } else {
        last.segs.push(seg);
      }
    }

    return groups;
  }, [filtered]);

  // Scroll to highlight
  useEffect(() => {
    if (!isOpen || highlightIds.length === 0) return;

    if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);

    const timer = setTimeout(() => {
      const el = document.getElementById(`seg-${highlightIds[0]}`);

      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [isOpen, highlightIds]);

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        ref={panelRef}
        className={cn(
          "fixed right-0 top-0 z-40 flex h-full w-[380px] max-w-[90vw] flex-col",
          "bg-[#0c1a09] border-l border-[#26a269]/15",
          "transition-transform duration-300",
          isOpen ? "translate-x-0" : "translate-x-full",
        )}
      >
        {/* Header */}

        <div className="flex items-center justify-between border-b border-[#26a269]/15 px-4 py-3 flex-shrink-0">
          <div className="flex items-center gap-2">
            <FileText size={14} className="text-[#9fd8ad]" />
            <h2 className="text-sm font-medium text-white">Transcript</h2>
            <span className="rounded-full bg-[#0d1808] px-2 py-0.5 text-[11px] text-slate-500">
              {segments.length} lines
            </span>
          </div>

          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-md text-slate-500 hover:bg-[#10200f] hover:text-white"
          >
            <X size={14} />
          </button>
        </div>

        {/* Search */}

        <div className=" px-4 pt-3 flex-shrink-0">
          <div className="relative">
            <Search
              size={12}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600"
            />

            <input
              type="text"
              placeholder="Search transcript…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-[#26a269]/15 bg-[#0d1808] py-2.5 pl-8 pr-3 text-xs text-white placeholder-slate-600 outline-none focus:border-[#26a269]/40"
            />
          </div>

          {search && (
            <p className="mt-1 text-[11px] text-slate-600">
              {filtered.length} result
              {filtered.length !== 1 ? "s" : ""}
            </p>
          )}
        </div>

        {/* Transcript */}

        <div className="flex-1 overflow-y-auto px-3 pb-5">
          {grouped.map((group) => (
            <div key={group.file}>
              {/* Meeting Divider */}

              <div className="flex items-center  py-2 sticky top-0 bg-[#0c1a09] z-10">
                <div className="h-px flex-1 bg-[#26a269]/15" />

                <span className="text-[10px] uppercase text-slate-600">
                  {group.title}
                </span>

                <div className="h-px flex-1 bg-[#26a269]/15" />
              </div>

              {group.segs.map((seg, index) => {
                const side = index % 2 === 0 ? "left" : "right";
                const isHighlighted = highlightIds.includes(seg.id);

                return (
                  <div
                    key={seg.id}
                    id={`seg-${seg.id}`}
                    className={cn(
                      "mt-3 flex w-full",
                      side === "right" ? "justify-end" : "justify-start",
                    )}
                  >
                    <div
                      className={cn(
                        "max-w-[78%] border border-black/20 px-3 py-2.5 text-xs shadow-[0_8px_24px_rgba(0,0,0,0.18)] transition-all",
                        "bg-[#26a269] text-[#041102]",
                        side === "left"
                          ? "rounded-[20px] rounded-bl-[6px]"
                          : "rounded-[20px] rounded-br-[6px]",
                        isHighlighted &&
                          "bg-yellow-300 text-black ring-2 ring-yellow-400 shadow-lg",
                      )}
                    >
                      <div className="mb-1 flex items-center justify-between gap-3">
                        <span
                          className={cn(
                            "text-[11px] font-bold uppercase tracking-[0.08em]",
                            SPEAKER_NAME_COLOR,
                          )}
                        >
                          {seg.speaker}
                        </span>

                        {seg.startTime && (
                          <span className="font-mono text-[10px] opacity-70">
                            {seg.startTime}
                          </span>
                        )}
                      </div>

                      <p className="leading-relaxed">{seg.text}</p>

                      {isHighlighted && (
                        <span className="mt-1 inline-block text-[9px] bg-yellow-500/30 text-yellow-900 px-1.5 py-0.5 rounded border border-yellow-600">
                          source
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </aside>

      <style>{`
        .seg-highlighted {
          animation: seg-flash 2.5s ease-out forwards;
        }

        @keyframes seg-flash {
          0% { box-shadow: 0 0 0 4px rgba(234,179,8,0.6); }
          100% { box-shadow: 0 0 0 0 rgba(234,179,8,0); }
        }
      `}</style>
    </>
  );
}
