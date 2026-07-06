"use client";

import { useState, useRef, useCallback } from "react";

interface CustomerUploaderProps {
  projectId: string;
  onUploaded?: () => void;
}

type Phase = "idle" | "uploading" | "done" | "error";

export default function CustomerUploader({ projectId, onUploaded }: CustomerUploaderProps) {
  const [dragOver, setDragOver] = useState(false);
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [uploadedName, setUploadedName] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const uploadFile = useCallback(async (file: File) => {
    setError(null);
    setUploadedName(null);
    setPhase("uploading");

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch(`/api/projects/${projectId}/documents/customer-upload`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Upload failed");
      }

      const result = await res.json();
      setUploadedName(result.name);
      setPhase("done");
      onUploaded?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
      setPhase("error");
    }
  }, [projectId, onUploaded]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) uploadFile(file);
  }, [uploadFile]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadFile(file);
    if (inputRef.current) inputRef.current.value = "";
  }, [uploadFile]);

  return (
    <div className="space-y-3">
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => phase !== "uploading" && inputRef.current?.click()}
        className={`
          border-2 border-dashed rounded-lg px-5 py-4 text-center cursor-pointer transition-colors
          ${dragOver ? "border-esm-red bg-red-50" : "border-slate-300 hover:border-slate-400"}
          ${phase === "uploading" ? "opacity-50 pointer-events-none" : ""}
        `}
      >
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          onChange={handleFileSelect}
        />
        {phase === "uploading" ? (
          <p className="text-sm text-slate-500">Uploading...</p>
        ) : (
          <>
            <p className="text-sm font-medium text-slate-700">
              Drop a file here or click to browse
            </p>
            <p className="text-xs text-slate-400 mt-1">Max 25MB</p>
          </>
        )}
      </div>

      {error && <p className="text-sm text-esm-red">{error}</p>}

      {uploadedName && phase === "done" && (
        <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3 flex items-center gap-2">
          <svg className="w-4 h-4 text-green-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span className="text-sm text-green-700">{uploadedName} uploaded successfully</span>
        </div>
      )}
    </div>
  );
}
