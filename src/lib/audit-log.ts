import { createJsonStore } from "@/lib/data-store";

export interface AuditEntry {
  timestamp: string;
  actor: string;
  action: string;
  target: string;
  detail?: string;
  category: "auth" | "user" | "config" | "notification" | "project" | "question" | "email";
}

const store = createJsonStore<AuditEntry[]>("audit-log", []);
const MAX_ENTRIES = 500;

function loadEntries(): AuditEntry[] {
  return store.load();
}

function saveEntries(entries: AuditEntry[]): void {
  store.save(entries.slice(-MAX_ENTRIES));
}

export function logAudit(
  actor: string,
  action: string,
  target: string,
  category: AuditEntry["category"],
  detail?: string,
): void {
  const entries = loadEntries();
  entries.push({
    timestamp: new Date().toISOString(),
    actor,
    action,
    target,
    detail,
    category,
  });
  saveEntries(entries);
}

export function getAuditLog(options?: {
  category?: AuditEntry["category"];
  limit?: number;
}): AuditEntry[] {
  let entries = loadEntries();
  if (options?.category) {
    entries = entries.filter((e) => e.category === options.category);
  }
  entries.reverse();
  if (options?.limit) {
    entries = entries.slice(0, options.limit);
  }
  return entries;
}

export function getNotificationLog(limit = 50): AuditEntry[] {
  return getAuditLog({ category: "notification", limit });
}
