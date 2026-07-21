import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCustomerSession } from "@/lib/magic-link";
import { getProjectSuppliers, getSupplierStats } from "@/lib/supplier-store";
import SuppliersClient from "@/components/hub/SuppliersClient";

export async function generateMetadata(): Promise<Metadata> {
  return { title: "Supplier Enablement" };
}

export default async function SuppliersPage() {
  const session = await getCustomerSession();
  if (!session) redirect("/hub/login");

  const suppliers = getProjectSuppliers(session.projectId);
  const stats = getSupplierStats(session.projectId);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-esm-black dark:text-neutral-100">
            Supplier enablement
          </h1>
          <p className="text-sm text-esm-grey dark:text-neutral-400 mt-0.5">
            Track catalog setup progress for your suppliers
          </p>
        </div>
      </div>
      <SuppliersClient
        projectId={session.projectId}
        suppliers={suppliers}
        stats={stats}
      />
    </div>
  );
}
