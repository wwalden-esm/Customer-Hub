import { createJsonStore } from "@/lib/data-store";

export interface ChecklistConfirmation {
  projectId: string;
  itemKey: string;
  confirmedBy: string;
  confirmedAt: string;
  note?: string;
}

const store = createJsonStore<ChecklistConfirmation[]>("checklist-confirmations", []);

function loadAll(): ChecklistConfirmation[] {
  return store.load();
}

function saveAll(items: ChecklistConfirmation[]): void {
  store.save(items);
}

export function getProjectConfirmations(projectId: string): ChecklistConfirmation[] {
  return loadAll().filter((c) => c.projectId === projectId);
}

export function confirmItem(
  projectId: string,
  itemKey: string,
  confirmedBy: string,
  note?: string,
): ChecklistConfirmation {
  const all = loadAll();
  const existing = all.findIndex(
    (c) => c.projectId === projectId && c.itemKey === itemKey,
  );
  const entry: ChecklistConfirmation = {
    projectId,
    itemKey,
    confirmedBy,
    confirmedAt: new Date().toISOString(),
    note,
  };
  if (existing >= 0) {
    all[existing] = entry;
  } else {
    all.push(entry);
  }
  saveAll(all);
  return entry;
}

export function revokeConfirmation(projectId: string, itemKey: string): boolean {
  const all = loadAll();
  const idx = all.findIndex(
    (c) => c.projectId === projectId && c.itemKey === itemKey,
  );
  if (idx < 0) return false;
  all.splice(idx, 1);
  saveAll(all);
  return true;
}
