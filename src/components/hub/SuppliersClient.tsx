"use client";

import { useState } from "react";
import { Card, SectionLabel, Badge, Button, useToast } from "@/components/ui";
import type { Supplier, SupplierCatalogType, SupplierStatus } from "@/types/models";

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

const CATALOG_LABELS: Record<SupplierCatalogType, string> = {
  punchout: "Punchout",
  hosted: "Hosted",
  level2: "Level 2",
  other: "Other",
};

const PIPELINE_STAGES: SupplierStatus[] = ["requested", "outreach", "in_progress", "testing", "production"];

interface Props {
  projectId: string;
  suppliers: Supplier[];
  stats: { total: number; inProduction: number; active: number };
}

export default function SuppliersClient({ projectId, suppliers: initial, stats: initialStats }: Props) {
  const { toast } = useToast();
  const [suppliers, setSuppliers] = useState(initial);
  const [stats, setStats] = useState(initialStats);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    supplierName: "",
    catalogType: "punchout" as SupplierCatalogType,
    notes: "",
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formData.supplierName.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/suppliers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      if (!res.ok) throw new Error();
      const { supplier } = await res.json();
      setSuppliers((prev) => [supplier, ...prev]);
      setStats((prev) => ({ ...prev, total: prev.total + 1, active: prev.active + 1 }));
      setFormData({ supplierName: "", catalogType: "punchout", notes: "" });
      setShowForm(false);
      toast("Supplier request submitted", "success");
    } catch {
      toast("Failed to submit request", "error");
    } finally {
      setSubmitting(false);
    }
  }

  const activeSuppliers = suppliers.filter((s) => s.status !== "cancelled");
  const cancelledSuppliers = suppliers.filter((s) => s.status === "cancelled");

  return (
    <div className="space-y-6">
      {/* Pipeline summary */}
      <Card padding="md">
        <SectionLabel className="mb-3">Catalog pipeline</SectionLabel>
        <div className="flex items-center gap-1 mb-3">
          {PIPELINE_STAGES.map((stage) => {
            const count = activeSuppliers.filter((s) => s.status === stage).length;
            return (
              <div key={stage} className="flex-1 text-center">
                <div
                  className={`h-2 rounded-full ${
                    count > 0 ? "bg-[var(--hub-accent,#F4333F)]" : "bg-gray-200 dark:bg-neutral-700"
                  }`}
                />
                <p className="text-[10px] text-esm-grey dark:text-neutral-400 mt-1">{STATUS_LABELS[stage]}</p>
                <p className="text-sm font-semibold text-esm-black dark:text-neutral-100">{count}</p>
              </div>
            );
          })}
        </div>
        <div className="flex gap-4 text-xs text-esm-grey dark:text-neutral-400">
          <span><strong className="text-esm-black dark:text-neutral-100">{stats.total}</strong> total</span>
          <span><strong className="text-emerald-600">{stats.inProduction}</strong> in production</span>
          <span><strong className="text-blue-600">{stats.active}</strong> active</span>
        </div>
      </Card>

      {/* Request new supplier */}
      <div>
        <Button variant="accent" size="sm" onClick={() => setShowForm(!showForm)}>
          {showForm ? "Cancel" : "Request a supplier"}
        </Button>
      </div>

      {showForm && (
        <Card padding="md">
          <SectionLabel className="mb-3">Request a new supplier catalog</SectionLabel>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label htmlFor="sup-name" className="block text-xs font-medium text-esm-black dark:text-neutral-100 mb-1">
                Supplier name
              </label>
              <input
                id="sup-name"
                type="text"
                required
                value={formData.supplierName}
                onChange={(e) => setFormData({ ...formData, supplierName: e.target.value })}
                className="w-full border border-esm-border dark:border-neutral-600 rounded-card px-3 py-2 text-sm bg-white dark:bg-neutral-800 text-esm-black dark:text-neutral-100"
                placeholder="e.g. Fisher Scientific"
              />
            </div>
            <div>
              <label htmlFor="sup-type" className="block text-xs font-medium text-esm-black dark:text-neutral-100 mb-1">
                Catalog type
              </label>
              <select
                id="sup-type"
                value={formData.catalogType}
                onChange={(e) => setFormData({ ...formData, catalogType: e.target.value as SupplierCatalogType })}
                className="w-full border border-esm-border dark:border-neutral-600 rounded-card px-3 py-2 text-sm bg-white dark:bg-neutral-800 text-esm-black dark:text-neutral-100"
              >
                {Object.entries(CATALOG_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="sup-notes" className="block text-xs font-medium text-esm-black dark:text-neutral-100 mb-1">
                Notes (optional)
              </label>
              <textarea
                id="sup-notes"
                rows={2}
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="w-full border border-esm-border dark:border-neutral-600 rounded-card px-3 py-2 text-sm bg-white dark:bg-neutral-800 text-esm-black dark:text-neutral-100"
                placeholder="Any details about this supplier or catalog needs"
              />
            </div>
            <Button type="submit" variant="primary" size="sm" disabled={submitting}>
              {submitting ? "Submitting..." : "Submit request"}
            </Button>
          </form>
        </Card>
      )}

      {/* Supplier list */}
      {activeSuppliers.length === 0 && !showForm ? (
        <Card padding="md">
          <div className="text-center py-6">
            <p className="text-sm text-esm-grey dark:text-neutral-400 mb-2">No suppliers added yet</p>
            <p className="text-xs text-esm-muted">
              Request a supplier to begin the catalog enablement process
            </p>
          </div>
        </Card>
      ) : (
        <div className="space-y-3 stagger-list">
          {activeSuppliers.map((supplier) => (
            <SupplierCard key={supplier.id} supplier={supplier} />
          ))}
        </div>
      )}

      {cancelledSuppliers.length > 0 && (
        <details className="mt-4">
          <summary className="text-xs text-esm-grey dark:text-neutral-400 cursor-pointer hover:text-esm-black dark:hover:text-neutral-200">
            {cancelledSuppliers.length} cancelled supplier{cancelledSuppliers.length !== 1 ? "s" : ""}
          </summary>
          <div className="space-y-3 mt-3">
            {cancelledSuppliers.map((supplier) => (
              <SupplierCard key={supplier.id} supplier={supplier} />
            ))}
          </div>
        </details>
      )}
    </div>
  );
}

function SupplierCard({ supplier }: { supplier: Supplier }) {
  return (
    <Card padding="md" className="opacity-100">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm font-medium text-esm-black dark:text-neutral-100">
              {supplier.supplierName}
            </h3>
            <Badge variant={STATUS_VARIANTS[supplier.status]} pill>
              {STATUS_LABELS[supplier.status]}
            </Badge>
            <Badge variant="neutral">
              {CATALOG_LABELS[supplier.catalogType]}
            </Badge>
          </div>
          {supplier.notes && (
            <p className="text-xs text-esm-grey dark:text-neutral-400 mt-1 line-clamp-2">{supplier.notes}</p>
          )}
          <div className="flex gap-4 mt-2 text-[10px] text-esm-muted">
            {supplier.seAssignee && <span>SE: {supplier.seAssignee}</span>}
            {supplier.targetGoLive && (
              <span>Target: {new Date(supplier.targetGoLive).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
            )}
            {supplier.actualGoLive && (
              <span className="text-emerald-600">
                Live: {new Date(supplier.actualGoLive).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
              </span>
            )}
            <span>
              Updated {new Date(supplier.updatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
            </span>
          </div>
        </div>
      </div>
    </Card>
  );
}
