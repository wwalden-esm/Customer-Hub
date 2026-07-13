import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCustomerSession } from "@/lib/magic-link";
import { getSmartsheetConfig, getProjectDocuments } from "@/lib/smartsheet-data";
import CustomerDocumentsClient from "@/components/hub/CustomerDocumentsClient";

export async function generateMetadata(): Promise<Metadata> {
  return { title: "Documents" };
}

export default async function DocumentsPage() {
  const session = await getCustomerSession();
  if (!session) redirect("/hub/login");

  const config = getSmartsheetConfig(session.projectId);
  const documents = config.documentSheetId
    ? await getProjectDocuments(config.documentSheetId)
    : [];

  const readyDocs = documents.map((d) => ({
    id: d.id,
    name: d.name,
    fileSize: d.fileSize,
    generatedAt: d.generatedAt,
    linkUrl: d.linkUrl,
  }));

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-esm-black">Documents</h1>
        <a
          href="/hub/ask?category=Document+Request"
          className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-card border transition-colors hover:opacity-80"
          style={{ borderColor: "var(--hub-accent, #F4333F)", color: "var(--hub-accent, #F4333F)" }}
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Request a Document
        </a>
      </div>
      <CustomerDocumentsClient
        projectId={session.projectId}
        initialDocs={readyDocs}
      />
    </div>
  );
}
