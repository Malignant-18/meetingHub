// components/ActionTable.tsx
// Displays extracted decisions and action items in tabbed tables
// Includes: status toggle per action item, CSV export for both tables

"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import {
  Lightbulb,
  CheckSquare,
  Download,
  ChevronDown,
  Clock,
  Loader2,
  CheckCircle2,
  Circle,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Decision {
  id: string;
  decisionText: string;
}

interface ActionItem {
  id: string;
  task: string;
  responsiblePerson: string | null;
  deadline: string | null;
  status: "PENDING" | "IN_PROGRESS" | "DONE";
}

interface Props {
  meetingId: string;
  meetingTitle: string;
  decisions: Decision[];
  actionItems: ActionItem[];
}

// ─── Status helpers ────────────────────────────────────────────────────────
const statusCycle: Record<ActionItem["status"], ActionItem["status"]> = {
  PENDING: "IN_PROGRESS",
  IN_PROGRESS: "DONE",
  DONE: "PENDING",
};

const statusConfig: Record<
  ActionItem["status"],
  { label: string; icon: React.ReactNode; className: string }
> = {
  PENDING: {
    label: "Pending",
    icon: <Circle size={13} />,
    className: "text-slate-400 bg-slate-700/50 border-slate-600",
  },
  IN_PROGRESS: {
    label: "In progress",
    icon: <Loader2 size={13} className="animate-spin" />,
    className: "text-amber-400 bg-amber-900/30 border-amber-700/50",
  },
  DONE: {
    label: "Done",
    icon: <CheckCircle2 size={13} />,
    className: "text-emerald-400 bg-emerald-900/30 border-emerald-700/50",
  },
};

// ─── CSV export ────────────────────────────────────────────────────────────
function exportToCSV(
  decisions: Decision[],
  actionItems: ActionItem[],
  meetingTitle: string,
) {
  const escape = (v: string | null | undefined) =>
    `"${(v ?? "").replace(/"/g, '""')}"`;

  const decisionsCSV = [
    ["Type", "Content"],
    ...decisions.map((d) => ["Decision", d.decisionText]),
  ]
    .map((r) => r.map((c) => escape(c)).join(","))
    .join("\n");

  const actionsCSV = [
    ["Task", "Responsible Person", "Deadline", "Status"],
    ...actionItems.map((a) => [
      a.task,
      a.responsiblePerson ?? "Unassigned",
      a.deadline ?? "Not specified",
      a.status,
    ]),
  ]
    .map((r) => r.map((c) => escape(c)).join(","))
    .join("\n");

  const full = `DECISIONS\n${decisionsCSV}\n\nACTION ITEMS\n${actionsCSV}`;
  const blob = new Blob([full], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${meetingTitle.replace(/[^a-z0-9]/gi, "_")}_analysis.csv`;
  link.click();
  URL.revokeObjectURL(url);

  toast.success("CSV exported!");
}

function exportToPDF(
  decisions: Decision[],
  actionItems: ActionItem[],
  meetingTitle: string,
) {
  const lines = [
    `Meeting Analysis: ${meetingTitle}`,
    "",
    "Decisions",
    ...(decisions.length > 0
      ? decisions.map(
          (decision, index) => `${index + 1}. ${decision.decisionText}`,
        )
      : ["No decisions extracted."]),
    "",
    "Action Items",
    ...(actionItems.length > 0
      ? actionItems.map(
          (item, index) =>
            `${index + 1}. ${item.task} | Owner: ${
              item.responsiblePerson ?? "Unassigned"
            } | Deadline: ${item.deadline ?? "Not specified"} | Status: ${item.status}`,
        )
      : ["No action items extracted."]),
  ];

  const escapedLines = lines.map((line) =>
    line.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)"),
  );
  const textCommands = escapedLines
    .map((line, index) => {
      const y = 760 - index * 16;
      return `BT /F1 11 Tf 40 ${y} Td (${line}) Tj ET`;
    })
    .join("\n");

  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    `<< /Length ${textCommands.length} >>\nstream\n${textCommands}\nendstream`,
  ];

  let pdf = "%PDF-1.4\n";
  const offsets = [0];

  objects.forEach((object, index) => {
    offsets.push(pdf.length);
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });

  const xrefStart = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += "0000000000 65535 f \n";
  offsets.slice(1).forEach((offset) => {
    pdf += `${offset.toString().padStart(10, "0")} 00000 n \n`;
  });
  pdf += `trailer\n<< /Root 1 0 R /Size ${objects.length + 1} >>\nstartxref\n${xrefStart}\n%%EOF`;

  const blob = new Blob([pdf], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${meetingTitle.replace(/[^a-z0-9]/gi, "_")}_analysis.pdf`;
  link.click();
  URL.revokeObjectURL(url);

  toast.success("PDF exported!");
}

// ─── Main Component ────────────────────────────────────────────────────────
export default function ActionTable({
  meetingId,
  meetingTitle,
  decisions,
  actionItems,
}: Props) {
  const [activeTab, setActiveTab] = useState<"decisions" | "actions">(
    "decisions",
  );
  const [items, setItems] = useState<ActionItem[]>(actionItems);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // Cycle action item status via PATCH /api/action-items/[id]
  const toggleStatus = async (item: ActionItem) => {
    const nextStatus = statusCycle[item.status];
    setUpdatingId(item.id);

    // Optimistic update
    setItems((prev) =>
      prev.map((a) => (a.id === item.id ? { ...a, status: nextStatus } : a)),
    );

    try {
      const res = await fetch(`/api/action-items/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (!res.ok) throw new Error("Failed to update");
      //toast.success(`Marked as ${nextStatus.toLowerCase().replace("_", " ")}`);
    } catch {
      // Revert on failure
      setItems((prev) =>
        prev.map((a) => (a.id === item.id ? { ...a, status: item.status } : a)),
      );
      toast.error("Failed to update status");
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="bg-[#1e1c32] border border-slate-700/50 rounded-2xl overflow-hidden">
      {/* ── Tab header ── */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700/50">
        <div className="flex gap-1 bg-[#2d2a4a] rounded-lg p-1">
          <button
            onClick={() => setActiveTab("decisions")}
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all",
              activeTab === "decisions"
                ? "bg-[#1e1c32] text-white shadow-sm"
                : "text-slate-400 hover:text-slate-200",
            )}
          >
            <Lightbulb
              size={14}
              className={activeTab === "decisions" ? "text-amber-400" : ""}
            />
            Decisions
            <span
              className={cn(
                "text-xs px-1.5 py-0.5 rounded-full font-medium",
                activeTab === "decisions"
                  ? "bg-amber-900/50 text-amber-300"
                  : "bg-slate-700 text-slate-400",
              )}
            >
              {decisions.length}
            </span>
          </button>
          <button
            onClick={() => setActiveTab("actions")}
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all",
              activeTab === "actions"
                ? "bg-[#1e1c32] text-white shadow-sm"
                : "text-slate-400 hover:text-slate-200",
            )}
          >
            <CheckSquare
              size={14}
              className={activeTab === "actions" ? "text-emerald-400" : ""}
            />
            Action items
            <span
              className={cn(
                "text-xs px-1.5 py-0.5 rounded-full font-medium",
                activeTab === "actions"
                  ? "bg-emerald-900/50 text-emerald-300"
                  : "bg-slate-700 text-slate-400",
              )}
            >
              {items.length}
            </span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => exportToCSV(decisions, items, meetingTitle)}
            className="flex items-center gap-1.5 text-slate-400 hover:text-white border border-slate-600 hover:border-slate-400 text-xs px-3 py-1.5 rounded-lg transition-all"
          >
            <Download size={12} />
            Export CSV
          </button>
          <button
            onClick={() => exportToPDF(decisions, items, meetingTitle)}
            className="flex items-center gap-1.5 text-slate-400 hover:text-white border border-slate-600 hover:border-slate-400 text-xs px-3 py-1.5 rounded-lg transition-all"
          >
            <Download size={12} />
            Export PDF
          </button>
        </div>
      </div>

      {/* ── Decisions tab ── */}
      {activeTab === "decisions" && (
        <div>
          {decisions.length === 0 ? (
            <div className="py-12 text-center">
              <Lightbulb size={24} className="text-slate-600 mx-auto mb-2" />
              <p className="text-slate-500 text-sm">
                No decisions found in this transcript
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-700/40">
              {decisions.map((decision, idx) => (
                <div
                  key={decision.id}
                  className="flex items-start gap-4 px-5 py-4 hover:bg-white/[0.02] transition-colors"
                >
                  <div className="w-6 h-6 rounded-full bg-amber-900/40 border border-amber-700/50 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-amber-400 text-xs font-bold">
                      {idx + 1}
                    </span>
                  </div>
                  <p className="text-slate-200 text-sm leading-relaxed flex-1">
                    {decision.decisionText}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Action items tab ── */}
      {activeTab === "actions" && (
        <div>
          {items.length === 0 ? (
            <div className="py-12 text-center">
              <CheckSquare size={24} className="text-slate-600 mx-auto mb-2" />
              <p className="text-slate-500 text-sm">
                No action items found in this transcript
              </p>
            </div>
          ) : (
            <>
              {/* Summary bar */}
              <div className="flex items-center gap-6 px-5 py-3 bg-[#252340] border-b border-slate-700/30 text-xs text-slate-400">
                <span>
                  {items.filter((a) => a.status === "PENDING").length} pending
                </span>
                <span className="text-amber-400">
                  {items.filter((a) => a.status === "IN_PROGRESS").length} in
                  progress
                </span>
                <span className="text-emerald-400">
                  {items.filter((a) => a.status === "DONE").length} done
                </span>
              </div>

              {/* Table header */}
              <div className="grid grid-cols-12 gap-3 px-5 py-2.5 text-xs font-medium text-slate-500 uppercase tracking-wider border-b border-slate-700/30">
                <div className="col-span-5">Task</div>
                <div className="col-span-3">Responsible</div>
                <div className="col-span-2">Deadline</div>
                <div className="col-span-2">Status</div>
              </div>

              {/* Rows */}
              <div className="divide-y divide-slate-700/30">
                {items.map((item) => {
                  const sc = statusConfig[item.status];
                  return (
                    <div
                      key={item.id}
                      className={cn(
                        "grid grid-cols-12 gap-3 px-5 py-4 hover:bg-white/[0.02] transition-colors items-start",
                        item.status === "DONE" && "opacity-60",
                      )}
                    >
                      {/* Task */}
                      <div className="col-span-5">
                        <p
                          className={cn(
                            "text-sm text-slate-200 leading-snug",
                            item.status === "DONE" &&
                              "line-through text-slate-500",
                          )}
                        >
                          {item.task}
                        </p>
                      </div>

                      {/* Responsible person */}
                      <div className="col-span-3">
                        {item.responsiblePerson ? (
                          <span className="inline-flex items-center gap-1.5 bg-indigo-900/30 text-indigo-300 text-xs px-2 py-1 rounded-lg border border-indigo-700/30">
                            <span className="w-4 h-4 rounded-full bg-indigo-600 text-white text-[9px] font-bold flex items-center justify-center uppercase flex-shrink-0">
                              {item.responsiblePerson[0]}
                            </span>
                            <span className="truncate">
                              {item.responsiblePerson}
                            </span>
                          </span>
                        ) : (
                          <span className="text-slate-600 text-xs">
                            Unassigned
                          </span>
                        )}
                      </div>

                      {/* Deadline */}
                      <div className="col-span-2">
                        {item.deadline && item.deadline !== "Not specified" ? (
                          <span className="flex items-center gap-1 text-xs text-slate-300">
                            <Clock size={11} className="text-slate-500" />
                            {item.deadline}
                          </span>
                        ) : (
                          <span className="text-slate-600 text-xs">—</span>
                        )}
                      </div>

                      {/* Status — clickable to cycle */}
                      <div className="col-span-2">
                        <button
                          onClick={() => toggleStatus(item)}
                          disabled={updatingId === item.id}
                          className={cn(
                            "flex items-center gap-1.5 text-xs px-2 py-1 rounded-lg border font-medium transition-all",
                            "hover:opacity-80 disabled:cursor-not-allowed",
                            sc.className,
                          )}
                          title="Click to update status"
                        >
                          {updatingId === item.id ? (
                            <Loader2 size={11} className="animate-spin" />
                          ) : (
                            sc.icon
                          )}
                          <span className="hidden sm:block">{sc.label}</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
