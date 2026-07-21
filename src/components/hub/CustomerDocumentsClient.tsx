"use client";

import { useState, useMemo } from "react";
import { parseLocalDate } from "@/lib/date-utils";
import { SectionLabel, Card } from "@/components/ui";
import CustomerUploader from "./CustomerUploader";

interface DocInfo {
  id: string;
  name: string;
  fileSize: number | null;
  generatedAt: string | null;
  linkUrl?: string;
}

interface CustomerDocumentsClientProps {
  projectId: string;
  initialDocs: DocInfo[];
}

function docType(name: string): string {
  const lower = name.toLowerCase();
  if (lower.includes("workflow") && lower.endsWith(".xlsx")) return "Workflow XLSX";
  if (lower.includes("workflow") && lower.endsWith(".docx")) return "Workflow DOCX";
  if (lower.includes("uat") && lower.includes("tracker")) return "UAT Tracker";
  if (lower.includes("uat") && lower.includes("completion")) return "UAT Guide";
  if (lower.includes("charter")) return "Charter";
  if (lower.includes("training")) return "Training";
  if (lower.includes("go-live") || lower.includes("golive")) return "Go-Live";
  return "Other";
}

export default function CustomerDocumentsClient({
  projectId,
  initialDocs,
}: CustomerDocumentsClientProps) {
  const [docs, setDocs] = useState(initialDocs);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  const types = useMemo(() => {
    const s = new Set(docs.map((d) => docType(d.name)));
    return Array.from(s).sort();
  }, [docs]);

  const filtered = useMemo(() => {
    let list = docs;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((d) => d.name.toLowerCase().includes(q));
    }
    if (typeFilter !== "all") {
      list = list.filter((d) => docType(d.name) === typeFilter);
    }
    return list;
  }, [docs, search, typeFilter]);

  async function refreshDocs() {
    setRefreshing(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/documents`);
      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data) ? data : data.documents ?? [];
        setDocs(list);
      }
    } finally {
      setRefreshing(false);
    }
  }

  return (
    <>
      <Card padding="sm" className="!px-5 !py-4 mb-6">
        <SectionLabel className="mb-3">Upload a Document</SectionLabel>
        <CustomerUploader projectId={projectId} onUploaded={refreshDocs} />
      </Card>

      {/* Search + filter bar */}
      {docs.length > 0 && (
        <div className="flex items-center gap-3 mb-4">
          <div className="relative flex-1 max-w-sm">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search documents..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search documents"
              className="w-full pl-9 pr-3 py-2 text-sm border border-esm-border rounded-card"
            />
          </div>
          <label htmlFor="doc-type-filter" className="sr-only">Filter by document type</label>
          <select
            id="doc-type-filter"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="border border-esm-border rounded-card px-3 py-2 text-sm text-esm-black"
          >
            <option value="all">All types</option>
            {types.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
      )}

      {docs.length === 0 ? (
        <Card padding="sm" className="!px-6 !py-8 text-center">
          <svg className="w-10 h-10 mx-auto text-slate-300 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
          </svg>
          <p className="text-sm text-slate-500">No documents available yet.</p>
          <p className="text-xs text-esm-muted mt-1">Your ESM team will publish documents here as they become ready.</p>
        </Card>
      ) : filtered.length === 0 ? (
        <Card padding="sm" className="!px-6 !py-8 text-center">
          <p className="text-sm text-slate-500">No documents match your search.</p>
        </Card>
      ) : (
        <Card padding="sm" className="!p-0 divide-y divide-esm-border stagger-list">
          {refreshing && (
            <div className="px-5 py-2 text-xs text-esm-muted text-center" aria-live="polite">Refreshing…</div>
          )}
          {filtered.map((doc) => (
            <div key={doc.id} className="px-5 py-4 flex items-center justify-between gap-4">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-esm-black">{doc.name}</p>
                <p className="text-xs text-esm-grey mt-0.5">
                  <span className="inline-block bg-gray-100 text-esm-grey rounded-card px-1.5 py-px mr-2 text-[10px] font-medium uppercase">
                    {docType(doc.name)}
                  </span>
                  {doc.generatedAt && parseLocalDate(doc.generatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  {doc.fileSize && <> · {(doc.fileSize / 1024).toFixed(0)} KB</>}
                </p>
              </div>
              {doc.linkUrl ? (
                <a
                  href={doc.linkUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Open ${doc.name} in new tab`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white rounded-card transition-colors shrink-0"
                  style={{ backgroundColor: "var(--hub-accent)" }}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                  </svg>
                  Open
                </a>
              ) : (
                <a
                  href={`/api/projects/${projectId}/documents/${doc.id}/download`}
                  aria-label={`Download ${doc.name}`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white rounded-card transition-colors shrink-0"
                  style={{ backgroundColor: "var(--hub-accent)" }}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Download
                </a>
              )}
            </div>
          ))}
        </Card>
      )}
    </>
  );
}
