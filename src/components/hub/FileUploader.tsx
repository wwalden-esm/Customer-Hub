"use client";

import { useState, useRef, useCallback } from "react";

interface LegacyUploadResult {
  fileName: string;
  sizeBytes: number;
  processed: boolean;
  customerName?: string;
  generatedDocs: Array<{ name: string; type: string }>;
}

interface ExtractionResult {
  success: boolean;
  fileNames: string[];
  stepCount: number;
  ruleCount: number;
  savedToSmartsheet: boolean;
}

type UploadResult = LegacyUploadResult | ExtractionResult;

interface FileUploaderProps {
  projectId: string;
  mode?: "legacy" | "extract";
  onUploadComplete?: (result: UploadResult) => void;
}

type Phase = "idle" | "uploading" | "processing" | "done" | "error";

export default function FileUploader({
  projectId,
  mode = "legacy",
  onUploadComplete,
}: FileUploaderProps) {
  const [dragOver, setDragOver] = useState(false);
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<UploadResult | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const uploadFiles = useCallback(async (files: File[]) => {
    setError(null);
    setResult(null);
    setPhase("uploading");

    try {
      const formData = new FormData();

      if (mode === "extract") {
        for (const file of files) {
          formData.append("files", file);
        }
        setPhase("processing");
        const res = await fetch(`/api/projects/${projectId}/workflow-extract`, {
          method: "POST",
          body: formData,
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Extraction failed");
        }

        const extractionResult: ExtractionResult = await res.json();
        setResult(extractionResult);
        setPhase("done");
        setSelectedFiles([]);
        onUploadComplete?.(extractionResult);
      } else {
        formData.append("file", files[0]);
        setPhase("processing");
        const res = await fetch(`/api/projects/${projectId}/uploads`, {
          method: "POST",
          body: formData,
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Upload failed");
        }

        const uploadResult: LegacyUploadResult = await res.json();
        setResult(uploadResult);
        setPhase("done");
        setSelectedFiles([]);
        onUploadComplete?.(uploadResult);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
      setPhase("error");
    }
  }, [projectId, mode, onUploadComplete]);

  const addFiles = useCallback((newFiles: FileList | File[]) => {
    const fileArray = Array.from(newFiles);
    if (mode === "extract") {
      setSelectedFiles(prev => {
        const existing = new Set(prev.map(f => f.name + f.size));
        const unique = fileArray.filter(f => !existing.has(f.name + f.size));
        return [...prev, ...unique];
      });
    } else {
      if (fileArray[0]) uploadFiles([fileArray[0]]);
    }
  }, [mode, uploadFiles]);

  const removeFile = useCallback((index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    addFiles(e.dataTransfer.files);
  }, [addFiles]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) addFiles(e.target.files);
    if (inputRef.current) inputRef.current.value = "";
  }, [addFiles]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if ((e.key === "Enter" || e.key === " ") && phase !== "uploading" && phase !== "processing") {
      e.preventDefault();
      inputRef.current?.click();
    }
  }, [phase]);

  const busy = phase === "uploading" || phase === "processing";
  const isExtractMode = mode === "extract";
  const extractResult = result && "stepCount" in result ? result as ExtractionResult : null;
  const legacyResult = result && "fileName" in result ? result as LegacyUploadResult : null;

  return (
    <div className="space-y-3">
      <div
        role="button"
        tabIndex={0}
        aria-label={`Upload ${isExtractMode ? "files" : "a file"}. Drop ${isExtractMode ? "files" : "a file"} here or press Enter to browse. Accepts PDF, DOCX, XLSX, TXT, and CSV files up to 25MB.`}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => !busy && inputRef.current?.click()}
        onKeyDown={handleKeyDown}
        className={`
          border-2 border-dashed rounded-card p-6 text-center cursor-pointer transition-colors
          ${dragOver ? "border-[var(--hub-accent)] bg-red-50" : "border-esm-border hover:border-slate-400"}
          ${busy ? "opacity-50 pointer-events-none" : ""}
        `}
      >
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          accept=".pdf,.docx,.xlsx,.xls,.txt,.csv"
          multiple={isExtractMode}
          onChange={handleFileSelect}
          aria-label="Choose file to upload"
          tabIndex={-1}
        />
        <svg className="w-8 h-8 mx-auto text-esm-muted mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
        </svg>
        {phase === "uploading" && (
          <p className="text-sm text-esm-grey" aria-live="polite">Uploading {isExtractMode ? "files" : "file"}…</p>
        )}
        {phase === "processing" && (
          <div className="space-y-1" aria-live="polite">
            <p className="text-sm font-medium" style={{ color: "var(--hub-accent)" }}>
              {isExtractMode ? "Extracting workflow data…" : "Processing with AI…"}
            </p>
            <p className="text-xs text-esm-muted">
              {isExtractMode
                ? "Analyzing documents and building workflow structure"
                : "Extracting data and generating workflow documents"}
            </p>
          </div>
        )}
        {(phase === "idle" || phase === "done" || phase === "error") && (
          <>
            <p className="text-sm font-medium text-esm-black">
              Drop {isExtractMode ? "files" : "a file"} here or click to browse
            </p>
            <p className="text-xs text-esm-muted mt-1">
              PDF, DOCX, XLSX, TXT, CSV — max 25MB{isExtractMode ? " each" : ""}
            </p>
          </>
        )}
      </div>

      {/* File staging list (extract mode) */}
      {isExtractMode && selectedFiles.length > 0 && !busy && (
        <div className="space-y-2">
          <div className="text-xs font-medium text-esm-muted uppercase tracking-wider">
            {selectedFiles.length} file{selectedFiles.length > 1 ? "s" : ""} selected
          </div>
          <ul className="divide-y divide-slate-100 border border-esm-border rounded-card">
            {selectedFiles.map((file, i) => (
              <li key={`${file.name}-${file.size}`} className="flex items-center gap-2 px-3 py-2 text-sm">
                <svg className="w-4 h-4 text-esm-muted shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                </svg>
                <span className="truncate flex-1 text-esm-black">{file.name}</span>
                <span className="text-xs text-esm-muted shrink-0">
                  {(file.size / 1024).toFixed(0)} KB
                </span>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); removeFile(i); }}
                  className="text-esm-muted hover:text-red-500 shrink-0"
                  aria-label={`Remove ${file.name}`}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={() => uploadFiles(selectedFiles)}
            className="w-full py-2 px-4 rounded-card text-sm font-medium text-white transition-colors"
            style={{ backgroundColor: "var(--hub-accent)" }}
          >
            Extract Workflow Data from {selectedFiles.length} file{selectedFiles.length > 1 ? "s" : ""}
          </button>
        </div>
      )}

      {error && (
        <div role="alert" className="text-sm" style={{ color: "var(--hub-accent)" }}>{error}</div>
      )}

      {extractResult && phase === "done" && (
        <div role="status" className="bg-green-50 border border-green-200 rounded-card px-4 py-3 space-y-1">
          <div className="flex items-center gap-2 text-sm text-green-700">
            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span className="font-medium">Workflow data extracted successfully</span>
          </div>
          <p className="text-xs text-green-600 ml-6">
            {extractResult.stepCount} step{extractResult.stepCount !== 1 ? "s" : ""}, {extractResult.ruleCount} rule{extractResult.ruleCount !== 1 ? "s" : ""} found
            {extractResult.fileNames.length > 0 && ` from ${extractResult.fileNames.join(", ")}`}
          </p>
          {extractResult.savedToSmartsheet && (
            <p className="text-xs text-green-500 ml-6">Draft saved to Smartsheet</p>
          )}
        </div>
      )}

      {legacyResult && phase === "done" && (
        <div role="status" className="bg-green-50 border border-green-200 rounded-card px-4 py-3 space-y-1">
          <div className="flex items-center gap-2 text-sm text-green-700">
            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span className="font-medium">{legacyResult.fileName} processed successfully</span>
          </div>
          {legacyResult.generatedDocs.length > 0 && (
            <p className="text-xs text-green-600 ml-6">
              Generated: {legacyResult.generatedDocs.map((d) => d.name).join(", ")}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
