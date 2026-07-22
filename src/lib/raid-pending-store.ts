import { createJsonStore } from "@/lib/data-store";

export interface PendingRaidItem {
  id: string;
  projectId: string;
  type: "Risk" | "Action" | "Issue" | "Decision";
  item: string;
  notes: string;
  priority: "High" | "Medium" | "Low";
  assigned: string;
  submittedBy: string;
  submittedAt: string;
  review_status: "submitted" | "approved" | "changes_requested";
  review_notes?: string;
  reviewedBy?: string;
  reviewedAt?: string;
}

const store = createJsonStore<PendingRaidItem[]>("raid-pending", []);

function loadAll(): PendingRaidItem[] {
  return store.load();
}

function saveAll(items: PendingRaidItem[]): void {
  store.save(items);
}

function generateId(): string {
  return `raid-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

export function addPendingRaidItem(
  projectId: string,
  data: {
    type: PendingRaidItem["type"];
    item: string;
    notes: string;
    priority: PendingRaidItem["priority"];
    assigned: string;
    submittedBy: string;
  },
): PendingRaidItem {
  const items = loadAll();
  const pending: PendingRaidItem = {
    id: generateId(),
    projectId,
    type: data.type,
    item: data.item,
    notes: data.notes,
    priority: data.priority,
    assigned: data.assigned,
    submittedBy: data.submittedBy,
    submittedAt: new Date().toISOString(),
    review_status: "submitted",
  };
  items.push(pending);
  saveAll(items);
  return pending;
}

export function getPendingRaidItems(projectId: string): PendingRaidItem[] {
  return loadAll()
    .filter((i) => i.projectId === projectId)
    .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
}

export function getPendingRaidItem(id: string): PendingRaidItem | null {
  return loadAll().find((i) => i.id === id) ?? null;
}

export function updatePendingRaidItem(
  id: string,
  update: Partial<Pick<PendingRaidItem, "review_status" | "review_notes" | "reviewedBy" | "reviewedAt">>,
): PendingRaidItem | null {
  const items = loadAll();
  const idx = items.findIndex((i) => i.id === id);
  if (idx === -1) return null;
  Object.assign(items[idx], update);
  saveAll(items);
  return items[idx];
}

export function removePendingRaidItem(id: string): boolean {
  const items = loadAll();
  const idx = items.findIndex((i) => i.id === id);
  if (idx === -1) return false;
  items.splice(idx, 1);
  saveAll(items);
  return true;
}
