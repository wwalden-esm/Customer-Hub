import type { Project, Milestone, ActionItem, Metric, DocumentInfo, RaidLogItem, Meeting, CustomerContact } from "@/types/models";
import type { SmartsheetConfig } from "@/types/models";
import {
  getSheet,
  columnIdMap,
  cellValue,
  listSheetAttachments,
  getSheetPermalink,
} from "@/lib/smartsheet";
import { parseLocalDate } from "@/lib/date-utils";
import projectsJson from "../../config/projects.json";

const projects = projectsJson as Record<string, Omit<Project, "id"> & { password?: string }>;

export function getProjectById(id: string): Project | null {
  const cfg = projects[id];
  if (!cfg) return null;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { password: _pw, ...rest } = cfg as typeof cfg & { password?: string };
  return { id, ...rest } as Project;
}

export function getProjectPassword(id: string): string | null {
  const cfg = projects[id] as (typeof projects)[string] & { password?: string };
  return cfg?.password ?? null;
}

export function getProjectList(): Project[] {
  return Object.entries(projects).map(([id, cfg]) => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: _pw, ...rest } = cfg as typeof cfg & { password?: string };
    return { id, ...rest } as Project;
  });
}

export function getProjectContacts(id: string): CustomerContact[] {
  const p = projects[id] as (typeof projects)[string] & { contacts?: CustomerContact[] };
  return p?.contacts ?? [];
}

export function getSmartsheetConfig(id: string): SmartsheetConfig {
  const p = projects[id];
  return (p?.smartsheetConfig ?? {}) as SmartsheetConfig;
}

export function saveSmartsheetConfigField(projectId: string, field: string, value: string): void {
  const { readFileSync, writeFileSync } = require("fs");
  const { join } = require("path");
  const configPath = join(process.cwd(), "config", "projects.json");
  const all = JSON.parse(readFileSync(configPath, "utf-8"));
  if (!all[projectId]) return;
  if (!all[projectId].smartsheetConfig) all[projectId].smartsheetConfig = {};
  all[projectId].smartsheetConfig[field] = value;
  writeFileSync(configPath, JSON.stringify(all, null, 2) + "\n", "utf-8");
  // Update in-memory cache
  if (projects[projectId]) {
    (projects[projectId].smartsheetConfig as Record<string, string>)[field] = value;
  }
}

export function getSheetPermalinks(config: SmartsheetConfig): Record<string, string | undefined> {
  const result: Record<string, string | undefined> = {};
  const keys = [
    "projectPlanSheetId", "raidLogSheetId", "integrationTrackerSheetId",
    "meetingTrackerSheetId", "documentSheetId", "metricsSheetId",
  ] as const;
  for (const key of keys) {
    const id = config[key];
    if (id) result[key] = getSheetPermalink(id);
  }
  return result;
}

export async function getProjectMilestones(projectPlanSheetId: string): Promise<Milestone[]> {
  try {
    const sheet = await getSheet(projectPlanSheetId);
    const cols = columnIdMap(sheet);
    const nameCol = cols.get("Milestone / Task Name") ?? cols.get("Task");
    const startCol = cols.get("Start Date");
    const endCol = cols.get("End Date");
    const statusCol = cols.get("Status");
    const effStatusCol = cols.get("Effective Status");
    const pctCol = cols.get("% Complete");
    const milestoneCol = cols.get("Milestone");
    const healthCol = cols.get("Health");
    const rowLevelCol = cols.get("Row Level");
    const baselineStartCol = cols.get("Baseline Start") ?? cols.get("Baseline Start Date");
    const baselineEndCol = cols.get("Baseline End") ?? cols.get("Baseline End Date") ?? cols.get("Baseline Finish");

    if (!nameCol) return [];

    const detailedSheet = await (await import("./smartsheet")).ssFetch<{
      rows: Array<{ id: number; rowNumber: number; parentId?: number; cells: Array<{ columnId: number; value?: string | number | boolean | null; displayValue?: string }> }>;
    }>(`/sheets/${projectPlanSheetId}?include=objectValue`);

    const rootRowId = detailedSheet.rows[0]?.id;
    if (!rootRowId) return [];

    // Build parent-child maps
    const parentRowIds = new Set<number>();
    for (const row of detailedSheet.rows) {
      if (row.parentId) parentRowIds.add(row.parentId);
    }

    // Map row IDs to their names for phase lookup
    const rowNameMap = new Map<number, string>();
    for (const row of detailedSheet.rows) {
      const nc = row.cells.find((c) => c.columnId === nameCol);
      rowNameMap.set(row.id, String(nc?.displayValue ?? nc?.value ?? ""));
    }

    // Level-1 row IDs (direct children of root)
    const level1Ids = new Set<number>();
    for (const row of detailedSheet.rows) {
      if (row.parentId === rootRowId) level1Ids.add(row.id);
    }

    const getCellVal = (row: (typeof detailedSheet.rows)[number], colId: number | undefined) => {
      if (!colId) return null;
      const cell = row.cells.find((c) => c.columnId === colId);
      return cell?.displayValue ?? cell?.value ?? null;
    };

    // Include rows that are level-1 products, level-2 phases (with children), or milestone-flagged
    const milestoneRows = detailedSheet.rows.filter((r) => {
      if (r.id === rootRowId) return false;

      const effStatus = getCellVal(r, effStatusCol);
      if (effStatus && String(effStatus).toLowerCase() === "not applicable") return false;
      const status = getCellVal(r, statusCol);
      if (status && String(status).toLowerCase() === "cancelled") return false;

      const isMilestoneChecked = getCellVal(r, milestoneCol);
      const isLevel1 = r.parentId === rootRowId && parentRowIds.has(r.id);
      const isLevel2Parent = r.parentId != null && level1Ids.has(r.parentId) && parentRowIds.has(r.id);

      return isLevel1 || isLevel2Parent || isMilestoneChecked === true || isMilestoneChecked === "True" || isMilestoneChecked === "true";
    });

    const extractMilestone = (row: (typeof detailedSheet.rows)[number]): Milestone => {
      const name = String(getCellVal(row, nameCol) ?? "");
      const startRaw = getCellVal(row, startCol);
      const endRaw = getCellVal(row, endCol);
      const startDate = startRaw ? String(startRaw).split("T")[0] : undefined;
      const endDate = endRaw ? String(endRaw).split("T")[0] : undefined;
      const date = endDate ?? startDate;
      const status = getCellVal(row, statusCol);
      const pctRaw = getCellVal(row, pctCol);
      const percentComplete = pctRaw != null ? Number(pctRaw) : undefined;
      const healthRaw = getCellVal(row, healthCol);
      const health = healthRaw ? String(healthRaw) as Milestone["health"] : undefined;
      const baselineStartRaw = getCellVal(row, baselineStartCol);
      const baselineStartDate = baselineStartRaw ? String(baselineStartRaw).split("T")[0] : undefined;
      const baselineEndRaw = getCellVal(row, baselineEndCol);
      const baselineEndDate = baselineEndRaw ? String(baselineEndRaw).split("T")[0] : undefined;
      const isMilestoneChecked = getCellVal(row, milestoneCol);
      const isMilestone = isMilestoneChecked === true || isMilestoneChecked === "True" || isMilestoneChecked === "true";

      let milestoneStatus = "upcoming";
      if (status) {
        const s = String(status).toLowerCase();
        if (s === "complete" || s === "completed") milestoneStatus = "complete";
        else if (s.includes("progress")) milestoneStatus = "in-progress";
        else if (s === "on hold") milestoneStatus = "on-hold";
      }

      // Determine level: use Row Level formula if available, else infer from parentId
      const rowLevelRaw = getCellVal(row, rowLevelCol);
      let level: 1 | 2;
      if (rowLevelRaw != null && Number(rowLevelRaw) > 0) {
        level = Number(rowLevelRaw) <= 1 ? 1 : 2;
      } else {
        level = row.parentId === rootRowId ? 1 : 2;
      }

      // Phase = level-1 ancestor name (the product this milestone belongs to)
      let phase: string | undefined;
      if (row.parentId && row.parentId !== rootRowId) {
        if (level1Ids.has(row.parentId)) {
          phase = rowNameMap.get(row.parentId);
        } else {
          // Walk up to find level-1 ancestor
          const parentRow = detailedSheet.rows.find((r) => r.id === row.parentId);
          if (parentRow?.parentId && level1Ids.has(parentRow.parentId)) {
            phase = rowNameMap.get(parentRow.parentId);
          }
        }
      }

      return {
        id: String(row.id),
        name,
        date,
        startDate,
        endDate,
        baselineStartDate,
        baselineEndDate,
        status: milestoneStatus,
        percentComplete,
        level,
        phase,
        isMilestone,
        health,
      };
    };

    return milestoneRows.map(extractMilestone);
  } catch (e) {
    console.error("Failed to fetch milestones from project plan:", e);
    return [];
  }
}

export function deriveCurrentPhase(milestones: Milestone[], fallback: string): string {
  const phases = milestones.filter((m) => m.level === 1);
  if (phases.length === 0) return fallback;
  const inProgress = phases.find((m) => m.status === "in-progress");
  if (inProgress) return inProgress.name;
  const firstIncomplete = phases.find((m) => m.status !== "complete");
  if (firstIncomplete) return firstIncomplete.name;
  return "Complete";
}

export async function getProjectActionItems(actionItemSheetId: string): Promise<ActionItem[]> {
  try {
    const sheet = await getSheet(actionItemSheetId);
    const cols = columnIdMap(sheet);
    const descCol = cols.get("Description") ?? cols.get("Action Item") ?? cols.get("Item");
    const ownerCol = cols.get("Owner") ?? cols.get("Assigned");
    const dueCol = cols.get("Due Date") ?? cols.get("Target Date");
    const priorityCol = cols.get("Priority");
    const statusCol = cols.get("Status");

    return sheet.rows
      .filter((row) => {
        const desc = descCol ? cellValue(row, descCol) : null;
        return desc && String(desc).trim().length > 0;
      })
      .map((row) => ({
        id: String(row.id),
        description: descCol ? cellValue(row, descCol) ?? "" : "",
        owner: ownerCol ? cellValue(row, ownerCol) ?? undefined : undefined,
        dueDate: dueCol ? cellValue(row, dueCol) ?? undefined : undefined,
        priority: priorityCol ? cellValue(row, priorityCol) ?? "medium" : "medium",
        status: statusCol ? cellValue(row, statusCol) ?? "open" : "open",
      }));
  } catch {
    return [];
  }
}

export async function getProjectMetrics(metricsSheetId: string): Promise<Metric[]> {
  try {
    const sheet = await getSheet(metricsSheetId);
    const cols = columnIdMap(sheet);
    const typeCol = cols.get("Metric Type") ?? cols.get("Metric type") ?? cols.get("Type");
    const currentCol = cols.get("Current");
    const totalCol = cols.get("Total");
    const labelCol = cols.get("Label");

    return sheet.rows.map((row) => ({
      id: String(row.id),
      metricType: typeCol ? cellValue(row, typeCol) ?? "" : "",
      current: currentCol ? Number(cellValue(row, currentCol) ?? 0) : 0,
      total: totalCol ? Number(cellValue(row, totalCol) ?? 0) : 0,
      label: labelCol ? cellValue(row, labelCol) ?? undefined : undefined,
    }));
  } catch {
    return [];
  }
}

export async function getProjectDocuments(documentSheetId: string): Promise<DocumentInfo[]> {
  try {
    const docs: DocumentInfo[] = [];

    // File attachments on the sheet (exclude logo files)
    const attachments = await listSheetAttachments(documentSheetId);
    for (const att of attachments) {
      if (att.name.startsWith("customer-logo.")) continue;
      docs.push({
        id: String(att.id),
        type: inferDocType(att.name),
        name: att.name,
        status: "READY" as const,
        fileSize: att.sizeInKb ? att.sizeInKb * 1024 : null,
        generatedAt: att.createdAt ?? null,
        downloads: 0,
        smartsheetAttachmentId: att.id,
      });
    }

    // Rows in the Document Repository with links to other sheets
    const sheet = await getSheet(documentSheetId);
    const cols = columnIdMap(sheet);
    const nameColId = cols.get("Document Name");
    const linkColId = cols.get("Link");
    if (nameColId && linkColId) {
      for (const row of sheet.rows) {
        const nameCell = row.cells.find((c) => c.columnId === nameColId);
        const linkCell = row.cells.find((c) => c.columnId === linkColId);
        const docName = String(nameCell?.value ?? "").trim();
        if (docName === "Customer Logo") continue;
        const linkUrl = linkCell?.hyperlink?.url ?? String(linkCell?.value ?? "").trim();
        if (!docName || !linkUrl) continue;
        docs.push({
          id: `row-${row.id}`,
          type: inferDocType(docName),
          name: docName,
          status: "READY" as const,
          fileSize: null,
          generatedAt: null,
          downloads: 0,
          linkUrl,
        });
      }
    }

    return docs;
  } catch {
    return [];
  }
}

export async function getRaidLogItems(raidLogSheetId: string): Promise<RaidLogItem[]> {
  try {
    const sheet = await getSheet(raidLogSheetId);
    const cols = columnIdMap(sheet);
    const itemIdCol = cols.get("Item ID");
    const itemCol = cols.get("Item");
    const typeCol = cols.get("Type");
    const statusCol = cols.get("Status");
    const priorityCol = cols.get("Priority");
    const notesCol = cols.get("Notes");
    const assignedCol = cols.get("Assigned");
    const dateCol = cols.get("Target Date");

    return sheet.rows
      .filter((row) => {
        const item = itemCol ? cellValue(row, itemCol) : null;
        return item && item.trim().length > 0;
      })
      .map((row) => ({
        id: String(row.id),
        itemId: itemIdCol ? cellValue(row, itemIdCol) ?? "" : "",
        item: itemCol ? cellValue(row, itemCol) ?? "" : "",
        type: (typeCol ? cellValue(row, typeCol) ?? "Action" : "Action") as RaidLogItem["type"],
        status: (statusCol ? cellValue(row, statusCol) ?? "New" : "New") as RaidLogItem["status"],
        priority: (priorityCol ? cellValue(row, priorityCol) ?? "Medium" : "Medium") as RaidLogItem["priority"],
        notes: notesCol ? cellValue(row, notesCol) ?? "" : "",
        assigned: assignedCol ? cellValue(row, assignedCol) ?? "" : "",
        targetDate: dateCol ? cellValue(row, dateCol) ?? null : null,
      }));
  } catch {
    return [];
  }
}

export interface ActivityEvent {
  id: string;
  type: "milestone" | "document" | "raid" | "status" | "upload" | "system";
  title: string;
  detail: string | null;
  timestamp: string;
  actor: string | null;
}

export async function getProjectActivity(config: SmartsheetConfig): Promise<ActivityEvent[]> {
  const events: ActivityEvent[] = [];

  try {
    if (config.documentSheetId) {
      const attachments = await listSheetAttachments(config.documentSheetId);
      for (const att of attachments) {
        if (att.createdAt) {
          events.push({
            id: `doc-${att.id}`,
            type: "document",
            title: `Document uploaded: ${att.name}`,
            detail: att.sizeInKb ? `${Math.round(att.sizeInKb)} KB` : null,
            timestamp: att.createdAt,
            actor: null,
          });
        }
      }
    }
  } catch { /* skip */ }

  try {
    if (config.raidLogSheetId) {
      const items = await getRaidLogItems(config.raidLogSheetId);
      for (const item of items) {
        events.push({
          id: `raid-${item.id}`,
          type: "raid",
          title: `${item.type} logged: ${item.item}`,
          detail: `Status: ${item.status} | Priority: ${item.priority}`,
          timestamp: item.targetDate || "",
          actor: item.assigned || null,
        });
      }
    }
  } catch { /* skip */ }

  try {
    if (config.projectPlanSheetId) {
      const milestones = await getProjectMilestones(config.projectPlanSheetId);
      const completed = milestones.filter((m) => m.status === "complete");
      for (const m of completed) {
        events.push({
          id: `ms-${m.id}`,
          type: "milestone",
          title: `Milestone completed: ${m.name}`,
          detail: null,
          timestamp: m.endDate ?? m.date ?? new Date().toISOString(),
          actor: null,
        });
      }

      const inProgress = milestones.filter((m) => m.status === "in-progress");
      for (const m of inProgress) {
        events.push({
          id: `ms-active-${m.id}`,
          type: "milestone",
          title: `Milestone in progress: ${m.name}`,
          detail: m.percentComplete != null ? `${Math.round(m.percentComplete * 100)}% complete` : null,
          timestamp: m.startDate ?? m.date ?? new Date().toISOString(),
          actor: null,
        });
      }
    }
  } catch { /* skip */ }

  const dated = events.filter((e) => e.timestamp.length > 0);
  dated.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  return dated;
}

export async function getProjectMeetings(meetingTrackerSheetId: string): Promise<Meeting[]> {
  try {
    const sheet = await getSheet(meetingTrackerSheetId);
    const cols = columnIdMap(sheet);
    const weekCol = cols.get("Week");
    const daysCol = cols.get("Days");
    const phaseCol = cols.get("Phase");
    const milestoneCol = cols.get("Milestone");
    const dateCol = cols.get("Meeting Date");
    const statusCol = cols.get("Status");
    const prepCol = cols.get("SC Prep Items");
    const agendaCol = cols.get("Agenda Summary (90 min)");
    const delivCol = cols.get("Customer Deliverables Due");
    const notesCol = cols.get("Watch-Out / Notes");
    const actionCol = cols.get("Action Items Logged?");
    const recapCol = cols.get("Recap Sent?");

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return sheet.rows
      .filter((row) => {
        const week = weekCol ? cellValue(row, weekCol) : null;
        return week && week.trim().length > 0;
      })
      .map((row) => {
        const explicit = statusCol ? cellValue(row, statusCol) ?? "" : "";
        const dateStr = dateCol ? cellValue(row, dateCol) ?? null : null;
        const actionsLogged = actionCol ? cellValue(row, actionCol) === "true" : false;
        const recapDone = recapCol ? cellValue(row, recapCol) === "true" : false;

        let status: Meeting["status"];
        if (explicit === "Complete" || explicit === "Skipped" || explicit === "Upcoming") {
          status = explicit;
        } else if (dateStr) {
          const mtgDate = parseLocalDate(dateStr);
          if (actionsLogged && recapDone) {
            status = "Complete";
          } else if (mtgDate > today) {
            const msInWeek = 7 * 24 * 60 * 60 * 1000;
            status = mtgDate.getTime() - today.getTime() <= msInWeek ? "Upcoming" : "Scheduled";
          } else {
            status = "Upcoming";
          }
        } else {
          status = "Upcoming";
        }

        return {
          id: String(row.id),
          week: weekCol ? cellValue(row, weekCol) ?? "" : "",
          days: daysCol ? cellValue(row, daysCol) ?? "" : "",
          phase: phaseCol ? cellValue(row, phaseCol) ?? "" : "",
          milestone: milestoneCol ? cellValue(row, milestoneCol) ?? "" : "",
          meetingDate: dateStr,
          status,
          scPrepItems: prepCol ? cellValue(row, prepCol) ?? "" : "",
          agendaSummary: agendaCol ? cellValue(row, agendaCol) ?? "" : "",
          customerDeliverables: delivCol ? cellValue(row, delivCol) ?? "" : "",
          notes: notesCol ? cellValue(row, notesCol) ?? "" : "",
          actionItemsLogged: actionsLogged,
          recapSent: recapDone,
          recapAttachmentId: row.attachments?.find((a) => a.name.startsWith("Recap-"))?.id ?? null,
        };
      });
  } catch {
    return [];
  }
}

export interface IntegrationRow {
  id: string;
  name: string;
  status: string;
}

export async function getProjectIntegrations(integrationTrackerSheetId: string): Promise<IntegrationRow[]> {
  try {
    const sheet = await getSheet(integrationTrackerSheetId);
    const cols = columnIdMap(sheet);
    const integCol = cols.get("Integration") ?? cols.get("Integration Name");
    const statusCol = cols.get("Status") ?? cols.get("Integration Status");
    if (!integCol) return [];

    // Group checklist items by integration name and roll up status
    const groups = new Map<string, { total: number; complete: number; inProgress: number; blocked: number }>();
    for (const row of sheet.rows) {
      const name = integCol ? cellValue(row, integCol) : null;
      if (!name || !String(name).trim()) continue;
      const key = String(name).trim();
      const s = (statusCol ? cellValue(row, statusCol) ?? "" : "").toLowerCase();
      if (s === "n/a") continue;

      if (!groups.has(key)) groups.set(key, { total: 0, complete: 0, inProgress: 0, blocked: 0 });
      const g = groups.get(key)!;
      g.total++;
      if (s === "complete") g.complete++;
      else if (s === "in progress") g.inProgress++;
      else if (s === "blocked") g.blocked++;
    }

    return Array.from(groups.entries()).map(([name, g]) => {
      let status: string;
      if (g.complete === g.total) status = "Complete";
      else if (g.blocked > 0) status = `Blocked (${g.complete}/${g.total})`;
      else if (g.inProgress > 0 || g.complete > 0) status = `In Progress (${g.complete}/${g.total})`;
      else status = "Not Started";

      return { id: name, name, status };
    });
  } catch {
    return [];
  }
}

function inferDocType(fileName: string): string {
  const lower = fileName.toLowerCase();
  if (lower.includes("workflow") && lower.includes("data")) return "workflow-xlsx";
  if (lower.includes("workflow") && lower.includes("guide")) return "workflow-docx";
  if (lower.includes("uat") && lower.includes("tracker")) return "uat-tracker";
  if (lower.includes("uat") && lower.includes("completion")) return "uat-completion-guide";
  if (lower.includes("charter") || lower.includes("sow")) return "project-charter";
  if (lower.includes("training")) return "training-guide";
  if (lower.includes("go-live") || lower.includes("checklist")) return "go-live-checklist";
  if (lower.includes("intake")) return "intake-export";
  return "unknown";
}

