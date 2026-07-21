"use client";

import Link from "next/link";
import { Card, SectionLabel, Badge } from "@/components/ui";
import type { Supplier, SupplierStatus } from "@/types/models";

const STATUS_LABELS: Record<SupplierStatus, string> = {
  requested: "Requested",
  outreach: "Outreach",
  in_progress: "In Progress",
  testing: "Testing",
  production: "Production",
  on_hold: "On Hold",
  cancelled: "Cancelled",
};

const STATUS_VARIANTS: Record<SupplierStatus, "neutral" | "info" | "warning" | "success" | "danger"> = {
  requested: "neutral",
  outreach: "info",
  in_progress: "info",
  testing: "warning",
  production: "success",
  on_hold: "warning",
  cancelled: "danger",
};

interface ProjectRow {
  id: string;
  customerName: string;
  projectName: string;
}

interface Props {
  userName: string;
  mySuppliers: Supplier[];
  allActiveSuppliers: Supplier[];
  projects: ProjectRow[];
}

export default function SeWelcome({ userName, mySuppliers, allActiveSuppliers, projects }: Props) {
  const firstName = userName.split(" ")[0];
  const myActive = mySuppliers.filter((s) => s.status !== "cancelled" && s.status !== "production");
  const myTesting = mySuppliers.filter((s) => s.status === "testing");
  const unassigned = allActiveSuppliers.filter((s) => !s.seAssignee);

  const projectMap = new Map(projects.map((p) => [p.id, p]));

  return (
    <div className="mb-6">
      <h1 className="text-xl font-semibold text-esm-black dark:text-neutral-100 mb-1">
        Welcome back, {firstName}
      </h1>
      <p className="text-sm text-esm-grey dark:text-neutral-400 mb-4">
        Supplier Enablement Specialist
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        <div className="bg-white dark:bg-neutral-800 rounded-card px-4 py-3 border border-esm-border dark:border-neutral-700">
          <p className="text-[10px] font-bold text-esm-grey dark:text-neutral-400 uppercase tracking-wider">My active</p>
          <p className="text-2xl font-bold text-esm-black dark:text-neutral-100 mt-1">{myActive.length}</p>
        </div>
        <div className="bg-white dark:bg-neutral-800 rounded-card px-4 py-3 border border-esm-border dark:border-neutral-700">
          <p className="text-[10px] font-bold text-esm-grey dark:text-neutral-400 uppercase tracking-wider">In testing</p>
          <p className={`text-2xl font-bold mt-1 ${myTesting.length > 0 ? "text-amber-600" : "text-esm-black dark:text-neutral-100"}`}>{myTesting.length}</p>
        </div>
        <div className="bg-white dark:bg-neutral-800 rounded-card px-4 py-3 border border-esm-border dark:border-neutral-700">
          <p className="text-[10px] font-bold text-esm-grey dark:text-neutral-400 uppercase tracking-wider">Unassigned</p>
          <p className={`text-2xl font-bold mt-1 ${unassigned.length > 0 ? "text-red-600" : "text-emerald-600 dark:text-emerald-400"}`}>{unassigned.length}</p>
        </div>
        <div className="bg-white dark:bg-neutral-800 rounded-card px-4 py-3 border border-esm-border dark:border-neutral-700">
          <p className="text-[10px] font-bold text-esm-grey dark:text-neutral-400 uppercase tracking-wider">Total active (all)</p>
          <p className="text-2xl font-bold text-blue-600 mt-1">{allActiveSuppliers.length}</p>
        </div>
      </div>

      {myActive.length > 0 && (
        <Card padding="md" className="mb-4">
          <SectionLabel className="mb-3">My supplier queue</SectionLabel>
          <div className="space-y-2">
            {myActive.slice(0, 8).map((supplier) => {
              const proj = projectMap.get(supplier.projectId);
              return (
                <Link
                  key={supplier.id}
                  href={`/dashboard/${supplier.projectId}/suppliers`}
                  className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-neutral-700 last:border-0 hover:bg-gray-50 dark:hover:bg-neutral-800 -mx-2 px-2 rounded transition-colors"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-esm-black dark:text-neutral-100 truncate">
                      {supplier.supplierName}
                    </p>
                    <p className="text-[10px] text-esm-grey dark:text-neutral-400">
                      {proj?.customerName || supplier.projectId}
                    </p>
                  </div>
                  <Badge variant={STATUS_VARIANTS[supplier.status]} pill>
                    {STATUS_LABELS[supplier.status]}
                  </Badge>
                </Link>
              );
            })}
            {myActive.length > 8 && (
              <p className="text-xs text-esm-muted pt-1">
                +{myActive.length - 8} more suppliers
              </p>
            )}
          </div>
        </Card>
      )}

      {unassigned.length > 0 && (
        <Card padding="md" className="mb-4">
          <SectionLabel className="mb-3">Unassigned suppliers</SectionLabel>
          <div className="space-y-2">
            {unassigned.slice(0, 5).map((supplier) => {
              const proj = projectMap.get(supplier.projectId);
              return (
                <Link
                  key={supplier.id}
                  href={`/dashboard/${supplier.projectId}/suppliers`}
                  className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-neutral-700 last:border-0 hover:bg-gray-50 dark:hover:bg-neutral-800 -mx-2 px-2 rounded transition-colors"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-esm-black dark:text-neutral-100 truncate">
                      {supplier.supplierName}
                    </p>
                    <p className="text-[10px] text-esm-grey dark:text-neutral-400">
                      {proj?.customerName || supplier.projectId} &middot; Requested {new Date(supplier.requestedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </p>
                  </div>
                  <Badge variant="neutral" pill>Unassigned</Badge>
                </Link>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}
