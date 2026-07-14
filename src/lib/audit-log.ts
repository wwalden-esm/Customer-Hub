import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";

export interface AuditEntry {
  timestamp: string;
  actor: string;
  action: string;
  target: string;
  detail?: string;
  category: "auth" | "user" | "config" | "notification" | "project" | "question";
}

const AUDIT_FILE = join(process.cwd(), "config", "audit-log.json");
const MAX_ENTRIES = 500;

function loadEntries(): AuditEntry[] {
  if (!existsSync(AUDIT_FILE)) return [];
  try {
    return JSON.parse(readFileSync(AUDIT_FILE, "utf-8"));
  } catch {
    return [];
  }
}

function saveEntries(entries: AuditEntry[]): void {
  const trimmed = entries.slice(-MAX_ENTRIES);
  writeFileSync(AUDIT_FILE, JSON.stringify(trimmed, null, 2) + "\n", "utf-8");
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
