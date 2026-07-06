"use client";

import { useState, useRef, useCallback } from "react";

interface UploadResult {
  fileName: string;
  sizeBytes: number;
  processed: boolean;
  customerName?: string;
  generatedDocs: Array<{ name: string; type: string }>;
}

interface FileUploaderProps {
  projectId: string;
  onUploadComplete?: (result: UploadResult) => void;
}

type Phase = "idle" | "uploading" | "processing" | "done" | "error";

export default function FileUploader({ projectId, onUploadComplete }: FileUploaderProps) {
  const [dragOver, setDragOver] = useState(false);
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<UploadResult | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const uploadFile = useCallback(async (file: File) => {
    setError(null);
    setResult(null);
    setPhase("uploading");

    try {
      const formData = new FormData();
      formData.append("file", file);

      setPhase("processing");
      const res = await fetch(`/api/projects/${projectId}/uploads`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Upload failed");
      }

      const uploadResult: UploadResult = await res.json();
      setResult(uploadResult);
      setPhase("done");
      onUploadComplete?.(uploadResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
      setPhase("error");
    }
  }, [projectId, onUploadComplete]);

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

  const busy = phase === "uploading" || phase === "processing";

  return (
    <div className="space-y-3">
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => !busy && inputRef.current?.click()}
        className={`
          border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors
          ${dragOver ? "border-esm-red bg-red-50" : "border-slate-300 hover:border-slate-400"}
          ${busy ? "opacity-50 pointer-events-none" : ""}
        `}
      >
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          accept=".pdf,.docx,.xlsx,.xls,.txt,.csv"
          onChange={handleFileSelect}
        />
        <svg className="w-8 h-8 mx-auto text-slate-400 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
        </svg>
        {phase === "uploading" && (
          <p className="text-sm text-slate-500">Uploading file...</p>
        )}
        {phase === "processing" && (
          <div className="space-y-1">
            <p className="text-sm font-medium text-blue-600">Processing with AI...</p>
            <p className="text-xs text-slate-400">Extracting data and generating workflow documents</p>
          </div>
        )}
        {(phase === "idle" || phase === "done" || phase === "error") && (
          <>
            <p className="text-sm font-medium text-slate-700">
              Drop a file here or click to browse
            </p>
            <p className="text-xs text-slate-400 mt-1">
              PDF, DOCX, XLSX, TXT, CSV — max 25MB
            </p>
          </>
        )}
      </div>

      {error && (
        <p className="text-sm text-esm-red">{error}</p>
      )}

      {result && phase === "done" && (
        <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3 space-y-1">
          <div className="flex items-center gap-2 text-sm text-green-700">
            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span className="font-medium">{result.fileName} processed successfully</span>
          </div>
          {result.generatedDocs.length > 0 && (
            <p className="text-xs text-green-600 ml-6">
              Generated: {result.generatedDocs.map((d) => d.name).join(", ")}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
