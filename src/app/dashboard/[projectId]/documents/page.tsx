import { redirect } from "next/navigation";
import { getProjectById, getSmartsheetConfig, getProjectDocuments } from "@/lib/smartsheet-data";
import EsmDocumentsClient from "@/components/dashboard/EsmDocumentsClient";
import DashboardBreadcrumb from "@/components/dashboard/DashboardBreadcrumb";

export default async function EsmDocumentsPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;

  const project = getProjectById(projectId);
  if (!project) redirect("/dashboard");

  const config = getSmartsheetConfig(projectId);
  const documents = config.documentSheetId
    ? await getProjectDocuments(config.documentSheetId)
    : [];

  return (
    <div>
      <DashboardBreadcrumb
        items={[
          { label: project.customerName, href: `/dashboard/${projectId}` },
          { label: "Documents" },
        ]}
      />
      <div className="max-w-4xl mx-auto px-6 py-6">
        <h1 className="text-xl font-semibold text-esm-black mb-1">Documents</h1>
        <p className="text-sm text-esm-grey mb-6">{project.customerName}</p>

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
    </div>
  );
}
