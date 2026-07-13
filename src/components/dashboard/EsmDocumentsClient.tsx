"use client";

import { useState, useCallback } from "react";
import { parseLocalDate } from "@/lib/date-utils";
import FileUploader from "@/components/hub/FileUploader";
import { Card, Badge, type BadgeVariant } from "@/components/ui";
import { Button } from "@/components/ui/Button";

function DocumentPreviewModal({ doc, onClose }: { doc: DocRecord; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-lg shadow-xl max-w-lg w-full mx-4 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-esm-black">Document Preview</h3>
          <button onClick={onClose} className="text-esm-grey hover:text-esm-black">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="space-y-3">
          <div className="flex justify-between items-center py-2 border-b border-gray-100">
            <span className="text-sm text-esm-grey">Name</span>
            <span className="text-sm font-medium text-esm-black">{doc.name}</span>
          </div>
          <div className="flex justify-between items-center py-2 border-b border-gray-100">
            <span className="text-sm text-esm-grey">Type</span>
            <span className="text-sm text-esm-black">{doc.type}</span>
          </div>
          <div className="flex justify-between items-center py-2 border-b border-gray-100">
            <span className="text-sm text-esm-grey">Status</span>
            <Badge variant={STATUS_VARIANTS[doc.status] ?? "neutral"} pill>{doc.status}</Badge>
          </div>
          {doc.fileSize && (
            <div className="flex justify-between items-center py-2 border-b border-gray-100">
              <span className="text-sm text-esm-grey">File Size</span>
              <span className="text-sm text-esm-black">{(doc.fileSize / 1024).toFixed(0)} KB</span>
            </div>
          )}
          {doc.generatedAt && (
            <div className="flex justify-between items-center py-2 border-b border-gray-100">
              <span className="text-sm text-esm-grey">Generated</span>
              <span className="text-sm text-esm-black">
                {parseLocalDate(doc.generatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
              </span>
            </div>
          )}
          <div className="flex justify-between items-center py-2 border-b border-gray-100">
            <span className="text-sm text-esm-grey">Downloads</span>
            <span className="text-sm text-esm-black">{doc.downloads}</span>
          </div>
        </div>
        {doc.linkUrl && (
          <div className="mt-4">
            <a
              href={doc.linkUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-esm-red rounded hover:opacity-90 transition-opacity"
            >
              Open in New Tab
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

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

const STATUS_VARIANTS: Record<string, BadgeVariant> = {
  READY: "success",
  DRAFT: "warning",
  GENERATING: "info",
  ERROR: "danger",
};

export default function EsmDocumentsClient({ projectId, documents: initialDocs, enabledTypes }: Props) {
  const [documents, setDocuments] = useState(initialDocs);
  const DOC_TYPES = enabledTypes
    ? ALL_DOC_TYPES.filter((dt) => enabledTypes.includes(dt.key))
    : ALL_DOC_TYPES;
  const [generating, setGenerating] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [bulkProgress, setBulkProgress] = useState<{ current: number; total: number } | null>(null);
  const [bulkSummary, setBulkSummary] = useState<{ succeeded: number; failed: number } | null>(null);
  const [previewDoc, setPreviewDoc] = useState<DocRecord | null>(null);

  const handleBulkGenerate = useCallback(async (regenerateAll: boolean) => {
    setError(null);
    setBulkSummary(null);

    const typesToGenerate = regenerateAll
      ? DOC_TYPES.map((dt) => dt.key)
      : DOC_TYPES.filter((dt) => {
          const latest = documents.filter((d) => d.type === dt.key)[0];
          return !latest || latest.status !== "READY";
        }).map((dt) => dt.key);

    if (typesToGenerate.length === 0) {
      setBulkSummary({ succeeded: 0, failed: 0 });
      return;
    }

    setBulkProgress({ current: 0, total: typesToGenerate.length });
    let succeeded = 0;
    let failed = 0;

    for (let i = 0; i < typesToGenerate.length; i++) {
      const type = typesToGenerate[i];
      setBulkProgress({ current: i + 1, total: typesToGenerate.length });
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
        succeeded++;
      } catch {
        failed++;
      } finally {
        setGenerating((prev) => { const n = new Set(prev); n.delete(type); return n; });
      }
    }

    setBulkProgress(null);
    setBulkSummary({ succeeded, failed });
  }, [DOC_TYPES, documents, projectId]);

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

      {bulkSummary && (
        <div className={`rounded-lg px-4 py-3 text-sm ${bulkSummary.failed === 0 ? "bg-green-50 border border-green-200 text-green-700" : "bg-amber-50 border border-amber-200 text-amber-700"}`}>
          {bulkSummary.failed === 0
            ? `Generated ${bulkSummary.succeeded} document${bulkSummary.succeeded !== 1 ? "s" : ""}`
            : `${bulkSummary.succeeded} succeeded, ${bulkSummary.failed} failed`}
          {bulkSummary.succeeded === 0 && bulkSummary.failed === 0 && "All documents are already up to date"}
          <button onClick={() => setBulkSummary(null)} className="ml-3 underline hover:no-underline">Dismiss</button>
        </div>
      )}

      {/* Document generation */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Generate Documents</h2>
          <div className="flex items-center gap-2">
            {bulkProgress && (
              <span className="text-sm text-slate-500">
                Generating {bulkProgress.current} of {bulkProgress.total}...
              </span>
            )}
            <Button
              onClick={() => handleBulkGenerate(false)}
              disabled={!!bulkProgress || generating.size > 0}
              variant="primary"
              size="sm"
              className="text-sm"
            >
              Generate All
            </Button>
            <Button
              onClick={() => handleBulkGenerate(true)}
              disabled={!!bulkProgress || generating.size > 0}
              variant="secondary"
              size="sm"
              className="text-sm"
            >
              Regenerate All
            </Button>
          </div>
        </div>
        <Card padding="sm" className="!p-0 divide-y divide-slate-200">
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
                      <Badge variant={STATUS_VARIANTS[latest.status] ?? "neutral"} pill>
                        {latest.status}
                      </Badge>
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
                  <Button
                    onClick={() => handleGenerate(dt.key)}
                    disabled={isGen}
                    variant="secondary"
                    size="sm"
                    className="text-sm"
                  >
                    {isGen ? "Generating..." : latest ? "Regenerate" : "Generate"}
                  </Button>
                </div>
              </div>
            );
          })}
        </Card>
      </section>

      {/* Upload section */}
      <section>
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">Customer Uploads</h2>
        <Card padding="lg">
          <p className="text-sm text-slate-500 mb-4">
            Upload procurement workflow documents. Files are automatically processed with AI to extract
            workflow data and generate the corresponding templates.
          </p>
          <FileUploader
            projectId={projectId}
            onUploadComplete={handleUploadComplete}
          />
        </Card>
      </section>

      {/* All documents */}
      <section>
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">All Documents</h2>
        <Card padding="sm" className="!p-0 divide-y divide-slate-200">
          {documents.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <svg className="w-10 h-10 mx-auto text-slate-300 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
              </svg>
              <p className="text-sm font-medium text-esm-black mb-1">No documents generated yet</p>
              <p className="text-sm text-slate-500">Use the Generate buttons above to create project documents.</p>
            </div>
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
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPreviewDoc(d)}
                    className="text-sm text-esm-grey hover:text-esm-black hover:underline"
                  >
                    Preview
                  </button>
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
              </div>
            ))
          )}
        </Card>
      </section>

      {previewDoc && (
        <DocumentPreviewModal doc={previewDoc} onClose={() => setPreviewDoc(null)} />
      )}
    </div>
  );
}
