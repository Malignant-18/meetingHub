// components/UploadForm.tsx
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
} from "lucide-react";
import { cn, formatFileSize } from "@/lib/utils";
import { validateTranscriptFile } from "@/lib/parser";

interface FileWithStatus {
  file: File;
  status: "pending" | "uploading" | "success" | "error";
  error?: string;
  result?: {
    meetingId: string;
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

export default function UploadForm() {
  const router = useRouter();
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
  const [projectCreated, setProjectCreated] = useState(false);

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

  // ─── Dropzone ──────────────────────────────────────────────────────────
  const onDrop = useCallback((accepted: File[], rejected: any[]) => {
    // Handle rejected files
    rejected.forEach(({ file, errors }) => {
      toast.error(`${file.name}: ${errors[0]?.message ?? "Invalid file"}`);
    });

    // Validate and add accepted files
    const newFiles: FileWithStatus[] = accepted.map((file) => {
      const validationError = validateTranscriptFile(file);
      return {
        file,
        status: validationError ? "error" : "pending",
        error: validationError ?? undefined,
      };
    });

    setFiles((prev) => {
      // Deduplicate by filename
      const existing = new Set(prev.map((f) => f.file.name));
      return [...prev, ...newFiles.filter((f) => !existing.has(f.file.name))];
    });
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "text/plain": [".txt"], "text/vtt": [".vtt"] },
    maxSize: 10 * 1024 * 1024,
    multiple: true,
  });

  const removeFile = (name: string) => {
    setFiles((prev) => prev.filter((f) => f.file.name !== name));
  };

  const handleSelectExistingProject = () => {
    if (!selectedProjectId) {
      toast.error("Please select an existing project");
      return;
    }

    setProjectId(selectedProjectId);
    setProjectCreated(true);
    toast.success("Project selected");
  };

  // ─── Create project ────────────────────────────────────────────────────
  const handleCreateProject = async () => {
    if (!projectName.trim()) {
      toast.error("Please enter a project name");
      return;
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
      setProjectCreated(true);
      toast.success("Project created!");
    } catch (err: any) {
      toast.error(err.message ?? "Failed to create project");
    } finally {
      setIsCreatingProject(false);
    }
  };

  // ─── Upload all files ──────────────────────────────────────────────────
  const handleUploadAll = async () => {
    if (!projectId) {
      toast.error("Create a project first");
      return;
    }
    const pending = files.filter((f) => f.status === "pending");
    if (pending.length === 0) {
      toast.error("No files ready to upload");
      return;
    }

    for (const fw of pending) {
      // Mark as uploading
      setFiles((prev) =>
        prev.map((f) =>
          f.file.name === fw.file.name ? { ...f, status: "uploading" } : f,
        ),
      );

      try {
        const formData = new FormData();
        formData.append("file", fw.file);
        formData.append("projectId", projectId);
        formData.append("title", fw.file.name.replace(/\.[^/.]+$/, ""));

        const res = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);

        setFiles((prev) =>
          prev.map((f) =>
            f.file.name === fw.file.name
              ? { ...f, status: "success", result: data.data }
              : f,
          ),
        );
        toast.success(`${fw.file.name} uploaded!`);
      } catch (err: any) {
        setFiles((prev) =>
          prev.map((f) =>
            f.file.name === fw.file.name
              ? { ...f, status: "error", error: err.message ?? "Upload failed" }
              : f,
          ),
        );
        toast.error(`${fw.file.name}: ${err.message}`);
      }
    }
  };

  const allDone =
    files.length > 0 && files.every((f) => f.status === "success");
  const hasValidFiles = files.some((f) => f.status === "pending");

  return (
    <div className="space-y-6">
      {/* Step 1 — Project name */}
      <div className="bg-[#1e1c32] border border-slate-700/50 rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-6 h-6 rounded-full bg-indigo-600 text-white text-xs font-bold flex items-center justify-center">
            1
          </div>
          <h2 className="font-semibold text-white">Choose where to upload</h2>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 mb-4">
          <button
            type="button"
            onClick={() => {
              if (projectCreated) return;
              setMode("new");
              setProjectId(null);
            }}
            className={cn(
              "rounded-xl border px-4 py-3 text-left transition-colors",
              mode === "new"
                ? "border-indigo-500 bg-indigo-600/10"
                : "border-slate-700 bg-[#171629] hover:border-slate-600",
              projectCreated && "opacity-70",
            )}
          >
            <div className="text-sm font-medium text-white">
              Create new project
            </div>
            <div className="text-xs text-slate-400 mt-1">
              Start a fresh project and upload one or more meetings into it.
            </div>
          </button>

          <button
            type="button"
            onClick={() => {
              if (projectCreated) return;
              setMode("existing");
              setProjectId(null);
            }}
            className={cn(
              "rounded-xl border px-4 py-3 text-left transition-colors",
              mode === "existing"
                ? "border-indigo-500 bg-indigo-600/10"
                : "border-slate-700 bg-[#171629] hover:border-slate-600",
              projectCreated && "opacity-70",
            )}
          >
            <div className="text-sm font-medium text-white">
              Use existing project
            </div>
            <div className="text-xs text-slate-400 mt-1">
              Add this upload as a new meeting inside a project you already
              created.
            </div>
          </button>
        </div>

        {mode === "new" ? (
          <div className="flex gap-3">
            <input
              type="text"
              placeholder="e.g. Q3 Product Reviews, Client Onboarding..."
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              disabled={projectCreated}
              onKeyDown={(e) =>
                e.key === "Enter" && !projectCreated && handleCreateProject()
              }
              className="flex-1 bg-[#2d2a4a] border border-slate-600 text-white placeholder-slate-500 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500 disabled:opacity-60"
            />
            {!projectCreated ? (
              <button
                onClick={handleCreateProject}
                disabled={isCreatingProject || !projectName.trim()}
                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-medium px-4 py-2.5 rounded-xl transition-colors"
              >
                {isCreatingProject ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <FolderPlus size={14} />
                )}
                Create
              </button>
            ) : (
              <div className="flex items-center gap-2 text-emerald-400 text-sm px-4">
                <CheckCircle size={16} />
                Ready
              </div>
            )}
          </div>
        ) : (
          <div className="flex gap-3">
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              disabled={projectCreated || isLoadingProjects}
              className="flex-1 bg-[#2d2a4a] border border-slate-600 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500 disabled:opacity-60"
            >
              <option value="">
                {isLoadingProjects ? "Loading projects..." : "Select a project"}
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
            {!projectCreated ? (
              <button
                onClick={handleSelectExistingProject}
                disabled={!selectedProjectId || isLoadingProjects}
                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-medium px-4 py-2.5 rounded-xl transition-colors"
              >
                <CheckCircle size={14} />
                Select
              </button>
            ) : (
              <div className="flex items-center gap-2 text-emerald-400 text-sm px-4">
                <CheckCircle size={16} />
                Ready
              </div>
            )}
          </div>
        )}
      </div>

      {/* Step 2 — Drop zone */}
      <div
        className={cn(
          "bg-[#1e1c32] border border-slate-700/50 rounded-2xl p-6",
          !projectCreated && "opacity-50 pointer-events-none",
        )}
      >
        <div className="flex items-center gap-2 mb-4">
          <div
            className={cn(
              "w-6 h-6 rounded-full text-white text-xs font-bold flex items-center justify-center",
              projectCreated ? "bg-indigo-600" : "bg-slate-600",
            )}
          >
            2
          </div>
          <h2 className="font-semibold text-white">Upload transcript files</h2>
          <span className="text-xs text-slate-500 ml-auto">
            .txt and .vtt only, max 10MB each
          </span>
        </div>

        {/* Drop area */}
        <div
          {...getRootProps()}
          className={cn(
            "border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all",
            isDragActive
              ? "border-indigo-400 bg-indigo-600/10 dropzone-active"
              : "border-slate-600 hover:border-indigo-500/70 hover:bg-indigo-600/5",
          )}
        >
          <input {...getInputProps()} />
          <Upload
            size={32}
            className={cn(
              "mx-auto mb-3",
              isDragActive ? "text-indigo-400" : "text-slate-500",
            )}
          />
          {isDragActive ? (
            <p className="text-indigo-300 font-medium">Drop files here...</p>
          ) : (
            <>
              <p className="text-slate-300 font-medium mb-1">
                Drag and drop files here
              </p>
              <p className="text-slate-500 text-sm">or click to browse</p>
            </>
          )}
        </div>

        {/* File list */}
        {files.length > 0 && (
          <div className="mt-4 space-y-2">
            {files.map((fw) => (
              <div
                key={fw.file.name}
                className="flex items-center gap-3 bg-[#2d2a4a] rounded-xl px-4 py-3"
              >
                <FileText size={16} className="text-indigo-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-white truncate">
                    {fw.file.name}
                  </div>
                  <div className="text-xs text-slate-500">
                    {formatFileSize(fw.file.size)}
                  </div>
                </div>

                {/* Status */}
                <div className="flex-shrink-0">
                  {fw.status === "pending" && (
                    <span className="text-xs text-slate-400 bg-slate-700 px-2 py-0.5 rounded-full">
                      Ready
                    </span>
                  )}
                  {fw.status === "uploading" && (
                    <Loader2
                      size={16}
                      className="text-indigo-400 animate-spin"
                    />
                  )}
                  {fw.status === "success" && (
                    <CheckCircle size={16} className="text-emerald-400" />
                  )}
                  {fw.status === "error" && (
                    <div className="flex items-center gap-1 text-red-400">
                      <AlertCircle size={16} />
                      <span className="text-xs max-w-32 truncate">
                        {fw.error}
                      </span>
                    </div>
                  )}
                </div>

                {/* Success metadata */}
                {fw.status === "success" && fw.result && (
                  <div className="text-xs text-slate-400 hidden sm:block">
                    {fw.result.speakerCount} speakers ·{" "}
                    {fw.result.wordCount.toLocaleString()} words ·{" "}
                    {fw.result.segmentCount} segments
                  </div>
                )}

                {fw.status !== "uploading" && fw.status !== "success" && (
                  <button
                    onClick={() => removeFile(fw.file.name)}
                    className="text-slate-500 hover:text-red-400 transition-colors ml-1"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Step 3 — Actions */}
      <div className="flex items-center gap-4">
        <button
          onClick={handleUploadAll}
          disabled={!hasValidFiles || !projectCreated}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-medium px-6 py-2.5 rounded-xl transition-colors"
        >
          <Upload size={16} />
          Upload{" "}
          {files.filter((f) => f.status === "pending").length > 0
            ? `${files.filter((f) => f.status === "pending").length} file${files.filter((f) => f.status === "pending").length !== 1 ? "s" : ""}`
            : "files"}
        </button>

        {allDone && (
          <button
            onClick={() => router.push(`/projects/${projectId}`)}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-medium px-6 py-2.5 rounded-xl transition-colors"
          >
            <CheckCircle size={16} />
            View project
          </button>
        )}
      </div>
    </div>
  );
}
