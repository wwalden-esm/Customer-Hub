import { notFound } from "next/navigation";
import { getProjectById, getProjectPassword, getProjectContacts } from "@/lib/smartsheet-data";
import ProjectConfigForm from "@/components/dashboard/ProjectConfigForm";
import DashboardBreadcrumb from "@/components/dashboard/DashboardBreadcrumb";

export default async function ProjectConfigPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const project = getProjectById(projectId);
  if (!project) notFound();

  return (
    <div>
      <DashboardBreadcrumb
        items={[
          { label: project.customerName, href: `/dashboard/${project.id}` },
          { label: "Configure" },
        ]}
      />
      <div className="max-w-3xl mx-auto px-6 py-6">
        <h1 className="text-xl font-semibold text-esm-black mb-1">Hub Configuration</h1>
        <p className="text-sm text-esm-grey mb-6">{project.customerName} — {project.projectName}</p>
        <ProjectConfigForm
          project={{
            id: project.id,
            customerName: project.customerName,
            projectName: project.projectName,
            branding: project.branding,
            password: getProjectPassword(project.id) ?? undefined,
            sectionVisibility: project.sectionVisibility,
            documentTypes: project.documentTypes,
            links: project.links,
            contacts: getProjectContacts(project.id),
            smartsheetConfig: Object.fromEntries(
              Object.entries(project.smartsheetConfig).filter(([, v]) => v !== undefined) as [string, string][]
            ),
            allowCustomerRaidSubmissions: project.allowCustomerRaidSubmissions,
          }}
        />
      </div>
    </div>
  );
}
