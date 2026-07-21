"use client";

import { useState } from "react";
import CustomerDocumentsClient from "@/components/hub/CustomerDocumentsClient";
import DocumentRequestForm from "@/components/hub/DocumentRequestForm";

interface Doc {
  id: string;
  name: string;
  fileSize: number;
  generatedAt: string;
  linkUrl?: string;
}

interface Props {
  projectId: string;
  initialDocs: Doc[];
}

export default function DocumentsPageClient({ projectId, initialDocs }: Props) {
  const [showRequest, setShowRequest] = useState(false);

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-esm-black dark:text-neutral-100">Documents</h1>
        <button
          onClick={() => setShowRequest(true)}
          className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-card border transition-colors hover:opacity-80"
          style={{ borderColor: "var(--hub-accent, #F4333F)", color: "var(--hub-accent, #F4333F)" }}
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Request a document
        </button>
      </div>
      <CustomerDocumentsClient
        projectId={projectId}
        initialDocs={initialDocs}
      />
      {showRequest && (
        <DocumentRequestForm
          projectId={projectId}
          onClose={() => setShowRequest(false)}
        />
      )}
    </div>
  );
}
