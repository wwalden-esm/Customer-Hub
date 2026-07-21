import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCustomerSession } from "@/lib/magic-link";
import { getSmartsheetConfig, getProjectDocuments } from "@/lib/smartsheet-data";
import DocumentsPageClient from "@/components/hub/DocumentsPageClient";

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
    <DocumentsPageClient
      projectId={session.projectId}
      initialDocs={readyDocs}
    />
  );
}
