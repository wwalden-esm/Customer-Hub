import { notFound } from "next/navigation";
import { readFileSync } from "fs";
import { join } from "path";
import { getProjectById } from "@/lib/smartsheet-data";
import { getProjectSuppliers } from "@/lib/supplier-store";
import DashboardBreadcrumb from "@/components/dashboard/DashboardBreadcrumb";
import SupplierManagementClient from "@/components/dashboard/SupplierManagementClient";

function getSeUsers(): { email: string; name: string }[] {
  try {
    const raw = readFileSync(join(process.cwd(), "config", "esm-users.json"), "utf-8");
    const users = JSON.parse(raw) as { email: string; name: string; role: string }[];
    return users
      .filter((u) => u.role === "SE" || u.role === "ADMIN")
      .map(({ email, name }) => ({ email, name }));
  } catch {
    return [];
  }
}

export default async function SuppliersPage({ params }: { params: { projectId: string } }) {
  const project = getProjectById(params.projectId);
  if (!project) notFound();

  const suppliers = getProjectSuppliers(params.projectId);
  const seUsers = getSeUsers();

  return (
    <div>
      <DashboardBreadcrumb
        items={[
          { label: project.customerName, href: `/dashboard/${project.id}` },
          { label: "Supplier Enablement" },
        ]}
      />
      <div className="max-w-4xl mx-auto px-6 py-6">
        <div className="mb-6">
          <h1 className="text-xl font-semibold text-esm-black dark:text-neutral-100">
            Supplier enablement
          </h1>
          <p className="text-sm text-esm-grey dark:text-neutral-400 mt-0.5">
            Manage catalog suppliers for {project.customerName}
          </p>
        </div>
        <SupplierManagementClient
          projectId={project.id}
          suppliers={suppliers}
          seUsers={seUsers}
        />
      </div>
    </div>
  );
}
