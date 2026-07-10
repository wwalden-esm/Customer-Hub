import Link from "next/link";
import { notFound } from "next/navigation";
import { getProjectById, getProjectPassword, getProjectContacts } from "@/lib/smartsheet-data";
import ProjectConfigForm from "@/components/dashboard/ProjectConfigForm";

export default async function ProjectConfigPage({ params }: { params: { projectId: string } }) {
  const project = getProjectById(params.projectId);
  if (!project) notFound();

  return (
    <main className="min-h-screen bg-esm-grey-light">
      <div className="bg-white border-b border-esm-border">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center gap-2 text-sm text-esm-grey mb-2">
            <Link href="/dashboard" className="hover:text-esm-black">Dashboard</Link>
            <span>/</span>
            <Link href={`/dashboard/${project.id}`} className="hover:text-esm-black">{project.customerName}</Link>
            <span>/</span>
            <span className="text-esm-black">Configure</span>
          </div>
          <h1 className="text-xl font-semibold text-esm-black">Hub Configuration</h1>
          <p className="text-sm text-esm-grey">{project.customerName} — {project.projectName}</p>
        </div>
      </div>
      <div className="max-w-3xl mx-auto px-6 py-6">
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
          }}
        />
      </div>
    </main>
  );
}
