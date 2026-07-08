"use client";

import { useState, useCallback } from "react";
import { parseLocalDate } from "@/lib/date-utils";
import FileUploader from "@/components/hub/FileUploader";

interface DocRecord {
  id: string;
  type: string;
  name: string;
  status: string;
  fileSize: number | null;
  generatedAt: string | null;
  downloads: number;
  linkUrl?: string;
}

interface Props {
  projectId: string;
  documents: DocRecord[];
  enabledTypes?: string[];
}

export const ALL_DOC_TYPES = [
  { key: "workflow-xlsx", label: "Workflow Data Template", category: "Workflow" },
  { key: "workflow-docx", label: "Workflow Guide", category: "Workflow" },
  { key: "uat-tracker", label: "UAT Tracker", category: "Testing" },
  { key: "uat-completion-guide", label: "UAT Completion Guide", category: "Testing" },
  { key: "project-charter", label: "Project Charter / SOW", category: "Project" },
  { key: "training-guide", label: "Training Guide", category: "Project" },
  { key: "go-live-checklist", label: "Go-Live Checklist", category: "Project" },
];

const STATUS_BADGES: Record<string, string> = {
  READY: "bg-green-100 text-green-700",
  DRAFT: "bg-amber-100 text-amber-700",
  GENERATING: "bg-blue-100 text-blue-700",
  ERROR: "bg-red-100 text-red-700",
};

export default function EsmDocumentsClient({ projectId, documents: initialDocs, enabledTypes }: Props) {
  const [documents, setDocuments] = useState(initialDocs);
  const DOC_TYPES = enabledTypes
    ? ALL_DOC_TYPES.filter((dt) => enabledTypes.includes(dt.key))
    : ALL_DOC_TYPES;
  const [generating, setGenerating] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = useCallback(async (type: string) => {
    setError(null);
    setGenerating((prev) => new Set(prev).add(type));
    try {
      const res = await fetch(`/api/projects/${projectId}/documents/${type}`, { method: "POST" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Generation failed");
      }
      const result = await res.json();
      setDocuments((prev) => [
        {
          id: result.documentId,
          type,
          name: result.name,
          status: result.status || "READY",
          fileSize: result.fileSize,
          generatedAt: new Date().toISOString(),
          downloads: 0,
        },
        ...prev,
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setGenerating((prev) => { const n = new Set(prev); n.delete(type); return n; });
    }
  }, [projectId]);

  const handleUploadComplete = useCallback(() => {
    window.location.reload();
  }, []);

  return (
    <div className="space-y-8">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {/* Document generation */}
      <section>
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">Generate Documents</h2>
        <div className="bg-white rounded-lg border border-slate-200 divide-y divide-slate-200">
          {DOC_TYPES.map((dt) => {
            const docs = documents.filter((d) => d.type === dt.key);
            const latest = docs[0];
            const isGen = generating.has(dt.key);

            return (
              <div key={dt.key} className="px-6 py-4 flex items-center justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-esm-black">{dt.label}</p>
                    {latest && (
                      <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${STATUS_BADGES[latest.status] || ""}`}>
                        {latest.status}
                      </span>
                    )}
                  </div>
                  {latest && (
                    <p className="text-xs text-slate-500 mt-0.5">
                      {latest.downloads} downloads
                      {latest.generatedAt && <> · {parseLocalDate(latest.generatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</>}
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  {latest?.status === "READY" && (
                    <a
                      href={`/api/projects/${projectId}/documents/${latest.id}/download`}
                      className="px-3 py-1.5 text-sm font-medium text-white bg-esm-red rounded hover:bg-esm-red/90"
                    >
                      Download
                    </a>
                  )}
                  <button
                    onClick={() => handleGenerate(dt.key)}
                    disabled={isGen}
                    className="px-3 py-1.5 text-sm font-medium text-esm-red border border-esm-red rounded hover:bg-red-50 disabled:opacity-50"
                  >
                    {isGen ? "Generating..." : latest ? "Regenerate" : "Generate"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Upload section */}
      <section>
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">Customer Uploads</h2>
        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <p className="text-sm text-slate-500 mb-4">
            Upload procurement workflow documents. Files are automatically processed with AI to extract
            workflow data and generate the corresponding templates.
          </p>
          <FileUploader
            projectId={projectId}
            onUploadComplete={handleUploadComplete}
          />
        </div>
      </section>

      {/* All documents */}
      <section>
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">All Documents</h2>
        <div className="bg-white rounded-lg border border-slate-200 divide-y divide-slate-200">
          {documents.length === 0 ? (
            <div className="px-6 py-4 text-sm text-slate-500">No documents generated yet.</div>
          ) : (
            documents.map((d) => (
              <div key={d.id} className="px-6 py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-esm-black">{d.name}</p>
                  <p className="text-xs text-slate-500">
                    {d.type} · {d.status} · {d.downloads} downloads
                    {d.fileSize && <> · {(d.fileSize / 1024).toFixed(0)} KB</>}
                  </p>
                </div>
                {d.linkUrl ? (
                  <a
                    href={d.linkUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-esm-red hover:underline"
                  >
                    Open
                  </a>
                ) : d.status === "READY" ? (
                  <a
                    href={`/api/projects/${projectId}/documents/${d.id}/download`}
                    className="text-sm text-esm-red hover:underline"
                  >
                    Download
                  </a>
                ) : null}
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
