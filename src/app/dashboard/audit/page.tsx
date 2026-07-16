import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getAuditLog } from "@/lib/audit-log";
import AuditLogClient from "@/components/dashboard/AuditLogClient";
import DashboardBreadcrumb from "@/components/dashboard/DashboardBreadcrumb";

export const dynamic = "force-dynamic";

export default async function AuditPage() {
  const session = await auth();

  // Admin-only access
  if (session?.user?.role !== "ADMIN") {
    redirect("/dashboard");
  }

  const entries = getAuditLog();

  return (
    <div>
      <DashboardBreadcrumb items={[{ label: "Audit Log" }]} />
      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="mb-6">
          <h1 className="text-xl font-semibold text-esm-black">Audit Log</h1>
          <p className="text-sm text-esm-grey mt-1">
            System activity log — admin only
          </p>
        </div>
        <AuditLogClient entries={entries} />
      </div>
    </div>
  );
}
