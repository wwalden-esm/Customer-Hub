import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getAuditLog } from "@/lib/audit-log";
import DashboardBreadcrumb from "@/components/dashboard/DashboardBreadcrumb";
import AuditLogClient from "@/components/dashboard/AuditLogClient";

export const metadata: Metadata = { title: "Audit Trail" };
export const dynamic = "force-dynamic";

export default async function AuditPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") redirect("/dashboard");

  const entries = getAuditLog({ limit: 200 });

  return (
    <div>
      <DashboardBreadcrumb items={[{ label: "Audit Trail" }]} />
      <div className="max-w-7xl mx-auto px-6 py-6">
        <h1 className="text-xl font-semibold text-esm-black mb-6">Audit Trail</h1>
        <AuditLogClient entries={entries} />
      </div>
    </div>
  );
}
