"use client";

import { useState } from "react";

const DOC_META: Record<string, { label: string; description: string }> = {
  "workflow-xlsx": { label: "Workflow Data (XLSX)", description: "Data collection spreadsheet" },
  "workflow-docx": { label: "Workflow Guide (DOCX)", description: "Process documentation guide" },
  "uat-tracker": { label: "UAT Tracker", description: "User acceptance test tracker" },
  "uat-completion-guide": { label: "UAT Completion", description: "UAT completion guide" },
  "project-charter": { label: "Project Charter", description: "Project scope and objectives" },
  "training-guide": { label: "Training Guide", description: "End-user training materials" },
  "go-live-checklist": { label: "Go-Live Checklist", description: "Pre-launch readiness checklist" },
};

export default function DocShortcuts({ projectId, documentTypes }: { projectId: string; documentTypes: string[] }) {
  const [generating, setGenerating] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const types = documentTypes.filter((t) => DOC_META[t]);

  if (types.length === 0) return null;

  async function generate(docType: string) {
    setGenerating(docType);
    setMessage(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/documents/${docType}`, { method: "POST" });
      if (!res.ok) throw new Error(await res.text());
      setMessage({ type: "success", text: `${DOC_META[docType]?.label ?? docType} generated` });
    } catch {
      setMessage({ type: "error", text: "Generation failed — try again" });
    } finally {
      setGenerating(null);
    }
  }

  return (
    <section className="bg-white border border-esm-border rounded-card p-5" aria-labelledby="doc-shortcuts-heading">
      <h2 id="doc-shortcuts-heading" className="text-[10px] font-extrabold text-esm-grey tracking-[0.09em] uppercase mb-3">
        Generate Documents
      </h2>
      {message && (
        <div className={`text-xs px-3 py-2 rounded-card mb-3 ${
          message.type === "success" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-esm-red"
        }`}>
          {message.text}
        </div>
      )}
      <div className="grid grid-cols-2 gap-2">
        {types.map((t) => {
          const meta = DOC_META[t];
          const isGenerating = generating === t;
          return (
            <button
              key={t}
              onClick={() => generate(t)}
              disabled={generating !== null}
              className="text-left px-3 py-2.5 border border-esm-border rounded-card hover:bg-slate-50 hover:border-esm-border-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed group"
            >
              <span className="text-xs font-medium text-esm-black block leading-snug">
                {isGenerating ? "Generating..." : meta.label}
              </span>
              <span className="text-[10px] text-esm-muted block mt-0.5">{meta.description}</span>
            </button>
          );
        })}
      </div>
      <a
        href="/hub/documents"
        className="block text-xs font-medium mt-3 hover:underline"
        style={{ color: "var(--hub-accent, #F4333F)" }}
      >
        View all documents →
      </a>
    </section>
  );
}
