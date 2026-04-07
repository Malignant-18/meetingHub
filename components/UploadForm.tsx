"use client";

import { useEffect, useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import {
  Upload,
  FileText,
  X,
  CheckCircle,
  AlertCircle,
  Loader2,
  FolderPlus,
  ArrowLeft,
  ArrowRight,
  FolderOpen,
} from "lucide-react";

import { cn, formatFileSize } from "@/lib/utils";
import { validateTranscriptFile } from "@/lib/parser";

interface FileWithStatus {
  file: File;
  status: "pending" | "uploading" | "success" | "error";
  error?: string;
  result?: {
    meetingId: string;
    meetingDate: string | null;
    speakerCount: number;
    wordCount: number;
    speakers: string[];
    segmentCount: number;
  };
}

interface ExistingProject {
  id: string;
  name: string;
  _count?: {
    meetings: number;
  };
}

type Step = 1 | 2;

function formatMeetingDate(value: string | null | undefined) {
  if (!value) return "Date not detected";

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Date not detected";

  return parsed.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function UploadForm() {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [mode, setMode] = useState<"new" | "existing">("new");
  const [projectName, setProjectName] = useState("");
  const [projectId, setProjectId] = useState<string | null>(null);
  const [existingProjects, setExistingProjects] = useState<ExistingProject[]>(
    [],
  );
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [isLoadingProjects, setIsLoadingProjects] = useState(true);
  const [files, setFiles] = useState<FileWithStatus[]>([]);
  const [isCreatingProject, setIsCreatingProject] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    const loadProjects = async () => {
      try {
        const res = await fetch("/api/projects");
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Failed to load projects");
        setExistingProjects(data.data ?? []);
      } catch (err: any) {
        toast.error(err.message ?? "Failed to load projects");
      } finally {
        setIsLoadingProjects(false);
      }
    };

    loadProjects();
  }, []);

  const onDrop = useCallback((accepted: File[], rejected: any[]) => {
    rejected.forEach(({ file, errors }) => {
      toast.error(`${file.name}: ${errors[0]?.message ?? "Invalid file"}`);
    });

    const newFiles: FileWithStatus[] = accepted.map((file) => {
      const validationError = validateTranscriptFile(file);
      return {
        file,
        status: validationError ? "error" : "pending",
        error: validationError ?? undefined,
      };
    });

    setFiles((prev) => {
      const existing = new Set(prev.map((item) => item.file.name));
      return [
        ...prev,
        ...newFiles.filter((item) => !existing.has(item.file.name)),
      ];
    });
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "text/plain": [".txt"], "text/vtt": [".vtt"] },
    maxSize: 10 * 1024 * 1024,
    multiple: true,
  });

  const removeFile = (name: string) => {
    setFiles((prev) => prev.filter((item) => item.file.name !== name));
  };

  const createProject = async () => {
    if (!projectName.trim()) {
      toast.error("Please enter a project name");
      return false;
    }

    setIsCreatingProject(true);
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: projectName.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setProjectId(data.data.id);
      toast.success("Project created");
      return true;
    } catch (err: any) {
      toast.error(err.message ?? "Failed to create project");
      return false;
    } finally {
      setIsCreatingProject(false);
    }
  };

  const selectExistingProject = () => {
    if (!selectedProjectId) {
      toast.error("Please select an existing project");
      return false;
    }

    setProjectId(selectedProjectId);
    toast.success("Project selected");
    return true;
  };

  const goNext = async () => {
    if (mode === "new" && !projectId) {
      const created = await createProject();
      if (created) setStep(2);
      return;
    }

    if (mode === "existing" && !projectId) {
      const selected = selectExistingProject();
      if (selected) setStep(2);
      return;
    }

    setStep(2);
  };

  const handleUploadAll = async () => {
    if (!projectId) {
      toast.error("Choose a project first");
      return;
    }

    const pending = files.filter((file) => file.status === "pending");
    if (pending.length === 0) {
      toast.error("No files ready to upload");
      return;
    }

    setIsUploading(true);

    for (const item of pending) {
      setFiles((prev) =>
        prev.map((file) =>
          file.file.name === item.file.name
            ? { ...file, status: "uploading" }
            : file,
        ),
      );

      try {
        const formData = new FormData();
        formData.append("file", item.file);
        formData.append("projectId", projectId);
        formData.append("title", item.file.name.replace(/\.[^/.]+$/, ""));

        const res = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);

        setFiles((prev) =>
          prev.map((file) =>
            file.file.name === item.file.name
              ? { ...file, status: "success", result: data.data }
              : file,
          ),
        );
      } catch (err: any) {
        setFiles((prev) =>
          prev.map((file) =>
            file.file.name === item.file.name
              ? {
                  ...file,
                  status: "error",
                  error: err.message ?? "Upload failed",
                }
              : file,
          ),
        );
        toast.error(`${item.file.name}: ${err.message ?? "Upload failed"}`);
      }
    }

    setIsUploading(false);
  };

  const allDone =
    files.length > 0 && files.every((file) => file.status === "success");
  const hasValidFiles = files.some((file) => file.status === "pending");
  const selectedProject = existingProjects.find(
    (project) => project.id === selectedProjectId,
  );
  const projectReadyLabel =
    mode === "new"
      ? projectName.trim() || "New project"
      : selectedProject?.name || "Existing project";

  return (
    <div className="mx-auto w-full max-w-4xl">
      <div className="mb-8 flex items-center justify-center gap-4">
        {[1, 2].map((value) => {
          const active = step === value;
          const complete = step > value;

          return (
            <div key={value} className="flex items-center gap-4">
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-full border text-sm font-semibold",
                    active || complete
                      ? "border-[#26a269]/30 bg-[#10200f] text-[#69FF97]"
                      : "border-[#26a269]/10 bg-[#081004] text-[#70907a]",
                  )}
                >
                  {complete ? <CheckCircle size={16} /> : value}
                </div>
                <span
                  className={cn(
                    "hidden text-sm sm:block",
                    active || complete ? "text-[#d5f5dc]" : "text-[#70907a]",
                  )}
                >
                  {value === 1 ? "Choose Project" : "Upload Files"}
                </span>
              </div>
              {value !== 2 && (
                <div className="hidden h-px w-16 bg-[#26a269]/12 sm:block" />
              )}
            </div>
          );
        })}
      </div>

      {step === 1 ? (
        <div className="rounded-[28px] border border-[#26a269]/20 bg-[#081004]/80 p-6 shadow-[0_30px_80px_rgba(0,0,0,0.45)] backdrop-blur-xl sm:p-8">
          <div className="mb-8 text-center">
            <h2 className="text-2xl font-semibold text-[#f6fff7]">
              Choose a project
            </h2>
          </div>

          <div className="grid gap-4 px-10 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => {
                setMode("new");
                setProjectId(null);
              }}
              className={cn(
                "rounded-[24px]   border py-3 text-left transition-colors",
                mode === "new"
                  ? "plasma-button plasma-button-primary text-[#041102]"
                  : "plasma-button plasma-button-outline text-[#ffffff]",
              )}
            >
              <div className="flex flex-row gap-4 items-center justify-center ">
                <FolderPlus size={22} />
                <p className="text-lg font-medium ">Create new project</p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => {
                setMode("existing");
                setProjectId(null);
              }}
              className={cn(
                "rounded-[24px] border py-3 text-left transition-colors",
                mode === "existing"
                  ? "plasma-button plasma-button-primary text-[#041102]"
                  : "plasma-button plasma-button-outline text-[#ffffff]",
              )}
            >
              <div className="flex flex-row gap-4 items-center justify-center">
                <FolderOpen size={22} />
                <p className="text-lg font-medium ">Use existing project</p>
              </div>
            </button>
          </div>

          <div className="mt-6 rounded-lg bg-[#0a1406] p-5">
            {mode === "new" ? (
              <>
                <label className="mb-2 block text-xs font-medium uppercase tracking-[0.18em] text-[#70907a]">
                  Project Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Product Review, Client Onboarding"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && void goNext()}
                  className="w-full rounded-lg border border-[#26a269]/30 bg-[#0d1808] px-4 py-3 text-sm text-[#f6fff7] outline-none placeholder:text-[#5f7c68] focus:border-[#26a269]"
                />
              </>
            ) : (
              <>
                <label className="mb-2 block text-xs font-medium uppercase tracking-[0.18em] text-[#70907a]">
                  Existing Project
                </label>
                <select
                  value={selectedProjectId}
                  onChange={(e) => setSelectedProjectId(e.target.value)}
                  disabled={isLoadingProjects}
                  className="w-full rounded-lg border border-[#26a269]/30 bg-[#0d1808] px-4 py-3 text-sm text-[#f6fff7] outline-none focus:border-[#26a269] disabled:opacity-60"
                >
                  <option value="">
                    {isLoadingProjects
                      ? "Loading projects..."
                      : "Select a project"}
                  </option>
                  {existingProjects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                      {typeof project._count?.meetings === "number"
                        ? ` (${project._count.meetings} meeting${project._count.meetings !== 1 ? "s" : ""})`
                        : ""}
                    </option>
                  ))}
                </select>
              </>
            )}
          </div>

          <div className="mt-6 flex items-center justify-between gap-4">
            <div className="text-sm text-[#70907a]">
              {projectId ? (
                <span className="text-[#69FF97]">
                  Ready: {projectReadyLabel}
                </span>
              ) : (
                "Pick a project destination to continue."
              )}
            </div>

            <button
              onClick={() => void goNext()}
              disabled={
                isCreatingProject ||
                (mode === "new"
                  ? !projectName.trim()
                  : !selectedProjectId || isLoadingProjects)
              }
              className="plasma-button plasma-button-secondary inline-flex items-center gap-2 rounded-full px-6 py-3 text-base font-semibold text-[#041102] transition-transform hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isCreatingProject ? (
                <Loader2 size={15} className="animate-spin" />
              ) : (
                <ArrowRight size={18} />
              )}
              Next
            </button>
          </div>
        </div>
      ) : (
        <div className="rounded-[28px] border border-[#26a269]/20 bg-[#081004]/80 p-6 shadow-[0_30px_80px_rgba(0,0,0,0.45)] backdrop-blur-xl sm:p-8">
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-2xl font-semibold text-[#f6fff7]">
                Upload transcript files
              </h2>
              <p className="mt-2 text-sm text-[#8fb79a]">
                Upload `.txt` or `.vtt` files into{" "}
                <span className="text-base font-medium text-[#69FF97]">
                  {projectReadyLabel}
                </span>
                .
              </p>
            </div>
            <div className="text-xs text-[#70907a]">10MB max per file</div>
          </div>

          <div
            {...getRootProps()}
            className={cn(
              "rounded-[28px] border border-dashed p-10 text-center transition-all",
              isDragActive
                ? "border-[#69FF97]/50 bg-[#10200f]"
                : "border-[#26a269]/18 bg-[#0a1406]/70 hover:border-[#26a269]/35 hover:bg-[#0d1808]",
            )}
          >
            <input {...getInputProps()} />
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-[#26a269]/18 bg-[#0d1808] text-[#69FF97]">
              <Upload size={22} />
            </div>
            {isDragActive ? (
              <p className="text-base font-medium text-[#d5f5dc]">
                Drop files here…
              </p>
            ) : (
              <>
                <p className="text-base font-medium text-[#f6fff7]">
                  Drag and drop transcript files
                </p>
                <p className="mt-2 text-sm text-[#8fb79a]">
                  or click to browse your `.txt` and `.vtt` files
                </p>
              </>
            )}
          </div>

          {files.length > 0 && (
            <div className="mt-6 space-y-3">
              {files.map((item) => (
                <div
                  key={item.file.name}
                  className="flex items-center gap-3 rounded-[22px] border border-[#26a269]/10 bg-[#0a1406]/72 px-4 py-4"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-[#26a269]/14 bg-[#0d1808] text-[#69FF97]">
                    <FileText size={16} />
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-[#f6fff7]">
                      {item.file.name}
                    </p>
                    <p className="mt-1 text-xs text-[#70907a]">
                      {formatFileSize(item.file.size)}
                      {item.status === "success" && item.result
                        ? ` · ${formatMeetingDate(item.result.meetingDate)}`
                        : ""}
                    </p>
                  </div>

                  <div className="flex-shrink-0">
                    {item.status === "pending" && (
                      <span className="rounded-full border border-[#26a269]/12 bg-[#0d1808] px-3 py-1 text-xs text-[#8fb79a]">
                        Ready
                      </span>
                    )}
                    {item.status === "uploading" && (
                      <Loader2
                        size={16}
                        className="animate-spin text-[#00E4FF]"
                      />
                    )}
                    {item.status === "success" && (
                      <CheckCircle size={16} className="text-[#69FF97]" />
                    )}
                    {item.status === "error" && (
                      <div className="flex items-center gap-1 text-[#ff9f9f]">
                        <AlertCircle size={16} />
                        <span className="max-w-32 truncate text-xs">
                          {item.error}
                        </span>
                      </div>
                    )}
                  </div>

                  {item.status === "success" && item.result && (
                    <div className="hidden text-xs text-[#70907a] sm:block">
                      {item.result.speakerCount} speakers ·{" "}
                      {item.result.wordCount.toLocaleString()} words ·{" "}
                      {item.result.segmentCount} segments
                    </div>
                  )}

                  {item.status !== "uploading" && item.status !== "success" && (
                    <button
                      onClick={() => removeFile(item.file.name)}
                      className="text-[#5f7c68] transition-colors hover:text-[#ff9f9f]"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <button
              onClick={() => setStep(1)}
              disabled={isUploading}
              className="inline-flex items-center gap-2 rounded-full border border-[#26a269]/18 bg-[#0d1808] px-5 py-3 text-sm text-[#d5f5dc] transition-colors hover:border-[#26a269]/35 hover:bg-[#10200f] disabled:opacity-50"
            >
              <ArrowLeft size={15} />
              Back
            </button>

            <div className="flex flex-col items-start gap-3 sm:items-end">
              <button
                onClick={handleUploadAll}
                disabled={!hasValidFiles || isUploading}
                className="plasma-button plasma-button-primary inline-flex items-center gap-2 text-[15px] font-semibold rounded-full px-6 py-3 text-sm font-medium text-[#041102] transition-transform hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-40"
              >
                {isUploading ? (
                  <Loader2 size={15} className="animate-spin" />
                ) : (
                  <Upload size={17} />
                )}
                Upload
              </button>

              {allDone && (
                <button
                  onClick={() => router.push(`/projects/${projectId}`)}
                  className="text-sm text-[#69FF97] transition-colors hover:text-[#9affba]"
                >
                  View project
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
