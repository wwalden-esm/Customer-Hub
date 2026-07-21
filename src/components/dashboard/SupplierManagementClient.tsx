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

const ALL_STATUSES: SupplierStatus[] = [
  "requested", "outreach", "in_progress", "testing", "production", "on_hold", "cancelled",
];

interface Props {
  projectId: string;
  suppliers: Supplier[];
  seUsers: { email: string; name: string }[];
}

export default function SupplierManagementClient({ projectId, suppliers: initial, seUsers }: Props) {
  const { toast } = useToast();
  const [suppliers, setSuppliers] = useState(initial);
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState<"all" | "active" | "production">("active");

  const [addForm, setAddForm] = useState({
    supplierName: "",
    catalogType: "punchout" as SupplierCatalogType,
    contactName: "",
    contactEmail: "",
    seAssignee: "",
    notes: "",
    targetGoLive: "",
  });

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!addForm.supplierName.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/suppliers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(addForm),
      });
      if (!res.ok) throw new Error();
      const { supplier } = await res.json();
      setSuppliers((prev) => [supplier, ...prev]);
      setAddForm({ supplierName: "", catalogType: "punchout", contactName: "", contactEmail: "", seAssignee: "", notes: "", targetGoLive: "" });
      setShowAdd(false);
      toast("Supplier added", "success");
    } catch {
      toast("Failed to add supplier", "error");
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdate(supplierId: string, updates: Record<string, string>) {
    setSaving(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/suppliers`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ supplierId, ...updates }),
      });
      if (!res.ok) throw new Error();
      const { supplier } = await res.json();
      setSuppliers((prev) => prev.map((s) => (s.id === supplierId ? supplier : s)));
      setEditingId(null);
      toast("Supplier updated", "success");
    } catch {
      toast("Failed to update supplier", "error");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(supplierId: string, name: string) {
    if (!confirm(`Delete ${name}? This cannot be undone.`)) return;
    try {
      const res = await fetch(`/api/projects/${projectId}/suppliers`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ supplierId }),
      });
      if (!res.ok) throw new Error();
      setSuppliers((prev) => prev.filter((s) => s.id !== supplierId));
      toast("Supplier deleted", "success");
    } catch {
      toast("Failed to delete supplier", "error");
    }
  }

  const filtered = suppliers.filter((s) => {
    if (filter === "active") return s.status !== "cancelled" && s.status !== "production";
    if (filter === "production") return s.status === "production";
    return true;
  });

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex gap-1">
          {(["active", "all", "production"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                filter === f
                  ? "bg-esm-black dark:bg-neutral-100 text-white dark:text-neutral-900"
                  : "bg-gray-100 dark:bg-neutral-700 text-esm-grey dark:text-neutral-300 hover:bg-gray-200 dark:hover:bg-neutral-600"
              }`}
            >
              {f === "active" ? `Active (${suppliers.filter((s) => s.status !== "cancelled" && s.status !== "production").length})` :
               f === "production" ? `Production (${suppliers.filter((s) => s.status === "production").length})` :
               `All (${suppliers.length})`}
            </button>
          ))}
        </div>
        <Button variant="primary" size="sm" onClick={() => setShowAdd(!showAdd)}>
          {showAdd ? "Cancel" : "Add supplier"}
        </Button>
      </div>

      {/* Add form */}
      {showAdd && (
        <Card padding="md">
          <SectionLabel className="mb-3">Add supplier</SectionLabel>
          <form onSubmit={handleAdd} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-esm-black dark:text-neutral-100 mb-1">Supplier name *</label>
              <input
                type="text"
                required
                value={addForm.supplierName}
                onChange={(e) => setAddForm({ ...addForm, supplierName: e.target.value })}
                className="w-full border border-esm-border dark:border-neutral-600 rounded-card px-3 py-2 text-sm bg-white dark:bg-neutral-800 text-esm-black dark:text-neutral-100"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-esm-black dark:text-neutral-100 mb-1">Catalog type</label>
              <select
                value={addForm.catalogType}
                onChange={(e) => setAddForm({ ...addForm, catalogType: e.target.value as SupplierCatalogType })}
                className="w-full border border-esm-border dark:border-neutral-600 rounded-card px-3 py-2 text-sm bg-white dark:bg-neutral-800 text-esm-black dark:text-neutral-100"
              >
                {Object.entries(CATALOG_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-esm-black dark:text-neutral-100 mb-1">Supplier contact name</label>
              <input
                type="text"
                value={addForm.contactName}
                onChange={(e) => setAddForm({ ...addForm, contactName: e.target.value })}
                className="w-full border border-esm-border dark:border-neutral-600 rounded-card px-3 py-2 text-sm bg-white dark:bg-neutral-800 text-esm-black dark:text-neutral-100"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-esm-black dark:text-neutral-100 mb-1">Supplier contact email</label>
              <input
                type="email"
                value={addForm.contactEmail}
                onChange={(e) => setAddForm({ ...addForm, contactEmail: e.target.value })}
                className="w-full border border-esm-border dark:border-neutral-600 rounded-card px-3 py-2 text-sm bg-white dark:bg-neutral-800 text-esm-black dark:text-neutral-100"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-esm-black dark:text-neutral-100 mb-1">SE assignee</label>
              <select
                value={addForm.seAssignee}
                onChange={(e) => setAddForm({ ...addForm, seAssignee: e.target.value })}
                className="w-full border border-esm-border dark:border-neutral-600 rounded-card px-3 py-2 text-sm bg-white dark:bg-neutral-800 text-esm-black dark:text-neutral-100"
              >
                <option value="">Unassigned</option>
                {seUsers.map((u) => (
                  <option key={u.email} value={u.name}>{u.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-esm-black dark:text-neutral-100 mb-1">Target go-live</label>
              <input
                type="date"
                value={addForm.targetGoLive}
                onChange={(e) => setAddForm({ ...addForm, targetGoLive: e.target.value })}
                className="w-full border border-esm-border dark:border-neutral-600 rounded-card px-3 py-2 text-sm bg-white dark:bg-neutral-800 text-esm-black dark:text-neutral-100"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-esm-black dark:text-neutral-100 mb-1">Notes</label>
              <textarea
                rows={2}
                value={addForm.notes}
                onChange={(e) => setAddForm({ ...addForm, notes: e.target.value })}
                className="w-full border border-esm-border dark:border-neutral-600 rounded-card px-3 py-2 text-sm bg-white dark:bg-neutral-800 text-esm-black dark:text-neutral-100"
              />
            </div>
            <div className="sm:col-span-2">
              <Button type="submit" variant="primary" size="sm" disabled={saving}>
                {saving ? "Adding..." : "Add supplier"}
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Supplier table */}
      {filtered.length === 0 ? (
        <Card padding="md">
          <div className="text-center py-8">
            <p className="text-sm text-esm-grey dark:text-neutral-400">
              {filter === "active" ? "No active suppliers" : filter === "production" ? "No suppliers in production yet" : "No suppliers added"}
            </p>
          </div>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((supplier) => (
            <SupplierRow
              key={supplier.id}
              supplier={supplier}
              seUsers={seUsers}
              isEditing={editingId === supplier.id}
              onEdit={() => setEditingId(editingId === supplier.id ? null : supplier.id)}
              onUpdate={(updates) => handleUpdate(supplier.id, updates)}
              onDelete={() => handleDelete(supplier.id, supplier.supplierName)}
              saving={saving}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function SupplierRow({
  supplier,
  seUsers,
  isEditing,
  onEdit,
  onUpdate,
  onDelete,
  saving,
}: {
  supplier: Supplier;
  seUsers: { email: string; name: string }[];
  isEditing: boolean;
  onEdit: () => void;
  onUpdate: (updates: Record<string, string>) => void;
  onDelete: () => void;
  saving: boolean;
}) {
  const [editData, setEditData] = useState({
    status: supplier.status,
    notes: supplier.notes,
    seAssignee: supplier.seAssignee || "",
    contactName: supplier.contactName || "",
    contactEmail: supplier.contactEmail || "",
    targetGoLive: supplier.targetGoLive || "",
    actualGoLive: supplier.actualGoLive || "",
  });

  function fmtDate(d: string | undefined) {
    if (!d) return "—";
    return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  }

  return (
    <Card padding="md">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm font-medium text-esm-black dark:text-neutral-100">
              {supplier.supplierName}
            </h3>
            <Badge variant={STATUS_VARIANTS[supplier.status]} pill>
              {STATUS_LABELS[supplier.status]}
            </Badge>
            <Badge variant="neutral">{CATALOG_LABELS[supplier.catalogType]}</Badge>
          </div>
          {!isEditing && (
            <>
              {supplier.notes && (
                <p className="text-xs text-esm-grey dark:text-neutral-400 mt-1">{supplier.notes}</p>
              )}
              <div className="flex gap-4 mt-2 text-[10px] text-esm-muted flex-wrap">
                <span>SE: {supplier.seAssignee || "Unassigned"}</span>
                {supplier.contactName && <span>Contact: {supplier.contactName}</span>}
                <span>Target: {fmtDate(supplier.targetGoLive)}</span>
                {supplier.actualGoLive && <span className="text-emerald-600">Live: {fmtDate(supplier.actualGoLive)}</span>}
                <span>Requested by: {supplier.requestedBy || "—"}</span>
                <span>Updated: {fmtDate(supplier.updatedAt)}</span>
              </div>
            </>
          )}
        </div>
        <div className="flex gap-1 shrink-0">
          <button
            onClick={onEdit}
            className="text-xs px-2 py-1 rounded border border-esm-border dark:border-neutral-600 hover:bg-gray-50 dark:hover:bg-neutral-700 text-esm-grey dark:text-neutral-300"
          >
            {isEditing ? "Cancel" : "Edit"}
          </button>
          <button
            onClick={onDelete}
            className="text-xs px-2 py-1 rounded border border-red-200 dark:border-red-800 hover:bg-red-50 dark:hover:bg-red-900/30 text-red-600"
          >
            Delete
          </button>
        </div>
      </div>

      {isEditing && (
        <div className="mt-4 pt-3 border-t border-esm-border dark:border-neutral-700">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-esm-black dark:text-neutral-100 mb-1">Status</label>
              <select
                value={editData.status}
                onChange={(e) => setEditData({ ...editData, status: e.target.value as SupplierStatus })}
                className="w-full border border-esm-border dark:border-neutral-600 rounded-card px-3 py-2 text-sm bg-white dark:bg-neutral-800 text-esm-black dark:text-neutral-100"
              >
                {ALL_STATUSES.map((s) => (
                  <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-esm-black dark:text-neutral-100 mb-1">SE assignee</label>
              <select
                value={editData.seAssignee}
                onChange={(e) => setEditData({ ...editData, seAssignee: e.target.value })}
                className="w-full border border-esm-border dark:border-neutral-600 rounded-card px-3 py-2 text-sm bg-white dark:bg-neutral-800 text-esm-black dark:text-neutral-100"
              >
                <option value="">Unassigned</option>
                {seUsers.map((u) => (
                  <option key={u.email} value={u.name}>{u.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-esm-black dark:text-neutral-100 mb-1">Supplier contact</label>
              <input
                type="text"
                value={editData.contactName}
                onChange={(e) => setEditData({ ...editData, contactName: e.target.value })}
                className="w-full border border-esm-border dark:border-neutral-600 rounded-card px-3 py-2 text-sm bg-white dark:bg-neutral-800 text-esm-black dark:text-neutral-100"
                placeholder="Contact name"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-esm-black dark:text-neutral-100 mb-1">Contact email</label>
              <input
                type="email"
                value={editData.contactEmail}
                onChange={(e) => setEditData({ ...editData, contactEmail: e.target.value })}
                className="w-full border border-esm-border dark:border-neutral-600 rounded-card px-3 py-2 text-sm bg-white dark:bg-neutral-800 text-esm-black dark:text-neutral-100"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-esm-black dark:text-neutral-100 mb-1">Target go-live</label>
              <input
                type="date"
                value={editData.targetGoLive}
                onChange={(e) => setEditData({ ...editData, targetGoLive: e.target.value })}
                className="w-full border border-esm-border dark:border-neutral-600 rounded-card px-3 py-2 text-sm bg-white dark:bg-neutral-800 text-esm-black dark:text-neutral-100"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-esm-black dark:text-neutral-100 mb-1">Actual go-live</label>
              <input
                type="date"
                value={editData.actualGoLive}
                onChange={(e) => setEditData({ ...editData, actualGoLive: e.target.value })}
                className="w-full border border-esm-border dark:border-neutral-600 rounded-card px-3 py-2 text-sm bg-white dark:bg-neutral-800 text-esm-black dark:text-neutral-100"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-esm-black dark:text-neutral-100 mb-1">Notes</label>
              <textarea
                rows={2}
                value={editData.notes}
                onChange={(e) => setEditData({ ...editData, notes: e.target.value })}
                className="w-full border border-esm-border dark:border-neutral-600 rounded-card px-3 py-2 text-sm bg-white dark:bg-neutral-800 text-esm-black dark:text-neutral-100"
              />
            </div>
            <div className="sm:col-span-2">
              <Button
                variant="primary"
                size="sm"
                onClick={() => onUpdate(editData)}
                disabled={saving}
              >
                {saving ? "Saving..." : "Save changes"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
