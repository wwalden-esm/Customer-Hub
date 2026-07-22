import { createJsonStore } from "@/lib/data-store";
import type { Supplier, SupplierStatus, SupplierCatalogType } from "@/types/models";

const store = createJsonStore<Supplier[]>("suppliers", []);

function loadAll(): Supplier[] {
  return store.load();
}

function saveAll(items: Supplier[]): void {
  store.save(items);
}

function generateId(): string {
  return `sup-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

export function getProjectSuppliers(projectId: string): Supplier[] {
  return loadAll()
    .filter((s) => s.projectId === projectId)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function getSupplierById(supplierId: string): Supplier | undefined {
  return loadAll().find((s) => s.id === supplierId);
}

export function getSuppliersByAssignee(email: string): Supplier[] {
  return loadAll()
    .filter((s) => s.seAssignee?.toLowerCase() === email.toLowerCase())
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function getAllActiveSuppliers(): Supplier[] {
  return loadAll()
    .filter((s) => s.status !== "cancelled" && s.status !== "production")
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function addSupplier(
  projectId: string,
  data: {
    supplierName: string;
    catalogType: SupplierCatalogType;
    contactName?: string;
    contactEmail?: string;
    seAssignee?: string;
    notes?: string;
    requestedBy?: string;
    targetGoLive?: string;
  },
): Supplier {
  const all = loadAll();
  const now = new Date().toISOString();
  const supplier: Supplier = {
    id: generateId(),
    projectId,
    supplierName: data.supplierName,
    catalogType: data.catalogType,
    status: "requested",
    contactName: data.contactName,
    contactEmail: data.contactEmail,
    seAssignee: data.seAssignee,
    notes: data.notes || "",
    requestedBy: data.requestedBy,
    requestedAt: now,
    updatedAt: now,
    targetGoLive: data.targetGoLive,
  };
  all.push(supplier);
  saveAll(all);
  return supplier;
}

export function updateSupplier(
  supplierId: string,
  updates: Partial<Pick<Supplier, "supplierName" | "catalogType" | "status" | "contactName" | "contactEmail" | "seAssignee" | "notes" | "targetGoLive" | "actualGoLive">>,
): Supplier | null {
  const all = loadAll();
  const idx = all.findIndex((s) => s.id === supplierId);
  if (idx === -1) return null;
  const updated = { ...all[idx], ...updates, updatedAt: new Date().toISOString() };
  all[idx] = updated;
  saveAll(all);
  return updated;
}

export function deleteSupplier(supplierId: string): boolean {
  const all = loadAll();
  const filtered = all.filter((s) => s.id !== supplierId);
  if (filtered.length === all.length) return false;
  saveAll(filtered);
  return true;
}

export function getSupplierStats(projectId: string): {
  total: number;
  byStatus: Record<SupplierStatus, number>;
  inProduction: number;
  active: number;
} {
  const suppliers = getProjectSuppliers(projectId);
  const byStatus: Record<SupplierStatus, number> = {
    requested: 0,
    outreach: 0,
    in_progress: 0,
    testing: 0,
    production: 0,
    on_hold: 0,
    cancelled: 0,
  };
  for (const s of suppliers) {
    byStatus[s.status]++;
  }
  return {
    total: suppliers.length,
    byStatus,
    inProduction: byStatus.production,
    active: suppliers.length - byStatus.production - byStatus.cancelled,
  };
}
