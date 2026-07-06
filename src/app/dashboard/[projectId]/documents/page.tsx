import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getProjectById, getSmartsheetConfig, getProjectDocuments } from "@/lib/smartsheet-data";
import EsmDocumentsClient from "@/components/dashboard/EsmDocumentsClient";

export default async function EsmDocumentsPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { projectId } = await params;

  const project = getProjectById(projectId);
  if (!project) redirect("/dashboard");

  const config = getSmartsheetConfig(projectId);
  const documents = config.documentSheetId
    ? await getProjectDocuments(config.documentSheetId)
    : [];

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-esm-black">Documents</h1>
        <p className="text-sm text-slate-500 mt-1">{project.customerName}</p>
      </div>

      <EsmDocumentsClient
        projectId={projectId}
        enabledTypes={project.documentTypes}
        documents={documents.map((d) => ({
          id: d.id,
          type: d.type,
          name: d.name,
          status: d.status,
          fileSize: d.fileSize,
          generatedAt: d.generatedAt,
          downloads: d.downloads,
          linkUrl: d.linkUrl,
        }))}
      />
    </div>
  );
}
