"use client";

import { useState, useCallback } from "react";
import { parseLocalDate } from "@/lib/date-utils";
import FileUploader from "@/components/hub/FileUploader";
import { Card, Badge, type BadgeVariant } from "@/components/ui";
import { Button } from "@/components/ui/Button";

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
        </Card>
      </section>
    </div>
  );
}
