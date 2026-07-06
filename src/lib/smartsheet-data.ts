import type { Project, Milestone, ActionItem, Metric, DocumentInfo, RaidLogItem, Meeting } from "@/types/models";
import type { SmartsheetConfig } from "@/types/models";
import {
  getSheet,
  columnIdMap,
  cellValue,
  listSheetAttachments,
} from "@/lib/smartsheet";
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

export function getSmartsheetConfig(id: string): SmartsheetConfig {
  const p = projects[id];
  return (p?.smartsheetConfig ?? {}) as SmartsheetConfig;
}

export async function getProjectMilestones(projectPlanSheetId: string): Promise<Milestone[]> {
  try {
    const sheet = await getSheet(projectPlanSheetId);
    const cols = columnIdMap(sheet);
    const nameCol = cols.get("Milestone / Task Name") ?? cols.get("Task");
    const startCol = cols.get("Start Date");
    const endCol = cols.get("End Date");
    const statusCol = cols.get("Status");
    const pctCol = cols.get("% Complete");

    if (!nameCol) return [];

    const detailedSheet = await (await import("./smartsheet")).ssFetch<{
      rows: Array<{ id: number; rowNumber: number; parentId?: number; cells: Array<{ columnId: number; value?: string | number | boolean | null; displayValue?: string }> }>;
    }>(`/sheets/${projectPlanSheetId}?include=objectValue`);

    const rootRowId = detailedSheet.rows[0]?.id;
    if (!rootRowId) return [];

    // Build set of row IDs that are parents (have at least one child)
    const parentRowIds = new Set<number>();
    for (const row of detailedSheet.rows) {
      if (row.parentId) parentRowIds.add(row.parentId);
    }

    // Level-1: direct children of root (e.g. "Project Initiation", "ESM Purchase")
    const level1Ids = new Set<number>();
    for (const row of detailedSheet.rows) {
      if (row.parentId === rootRowId) level1Ids.add(row.id);
    }

    // Milestone rows = level-1 parent rows + level-2 parent rows (children of level-1 that also have children)
    const milestoneRows = detailedSheet.rows.filter((r) =>
      (r.parentId === rootRowId || (r.parentId && level1Ids.has(r.parentId)))
      && parentRowIds.has(r.id),
    );

    const extractMilestone = (row: (typeof detailedSheet.rows)[number]) => {
      const nameCell = row.cells.find((c) => c.columnId === nameCol);
      const startCell = startCol ? row.cells.find((c) => c.columnId === startCol) : null;
      const endCell = endCol ? row.cells.find((c) => c.columnId === endCol) : null;
      const statusCell = statusCol ? row.cells.find((c) => c.columnId === statusCol) : null;
      const pctCell = pctCol ? row.cells.find((c) => c.columnId === pctCol) : null;

      const name = String(nameCell?.displayValue ?? nameCell?.value ?? "");
      const startDate = startCell?.value ? String(startCell.value) : undefined;
      const endDate = endCell?.value ? String(endCell.value) : undefined;
      const date = endDate ?? startDate;
      const status = statusCell?.displayValue ?? statusCell?.value;
      const pctRaw = pctCell?.value;
      const percentComplete = pctRaw != null ? Number(pctRaw) : undefined;

      let milestoneStatus = "upcoming";
      if (status) {
        const s = String(status).toLowerCase();
        if (s === "complete" || s === "completed") milestoneStatus = "complete";
        else if (s.includes("progress")) milestoneStatus = "in-progress";
      }

      return {
        id: String(row.id),
        name,
        date,
        startDate,
        endDate,
        status: milestoneStatus,
        percentComplete,
      };
    };

    return milestoneRows.map(extractMilestone);
  } catch (e) {
    console.error("Failed to fetch milestones from project plan:", e);
    return [];
  }
}

export async function getProjectActionItems(actionItemSheetId: string): Promise<ActionItem[]> {
  try {
    const sheet = await getSheet(actionItemSheetId);
    const cols = columnIdMap(sheet);
    const descCol = cols.get("Description") ?? cols.get("Action Item");
    const ownerCol = cols.get("Owner");
    const dueCol = cols.get("Due Date");
    const priorityCol = cols.get("Priority");
    const statusCol = cols.get("Status");

    return sheet.rows.map((row) => ({
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
    const typeCol = cols.get("Metric Type") ?? cols.get("Type");
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

    // File attachments on the sheet
    const attachments = await listSheetAttachments(documentSheetId);
    for (const att of attachments) {
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
          timestamp: item.targetDate ?? new Date().toISOString(),
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

  events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  return events;
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

    return sheet.rows
      .filter((row) => {
        const week = weekCol ? cellValue(row, weekCol) : null;
        return week && week.trim().length > 0;
      })
      .map((row) => ({
        id: String(row.id),
        week: weekCol ? cellValue(row, weekCol) ?? "" : "",
        days: daysCol ? cellValue(row, daysCol) ?? "" : "",
        phase: phaseCol ? cellValue(row, phaseCol) ?? "" : "",
        milestone: milestoneCol ? cellValue(row, milestoneCol) ?? "" : "",
        meetingDate: dateCol ? cellValue(row, dateCol) ?? null : null,
        status: (statusCol ? cellValue(row, statusCol) ?? "Upcoming" : "Upcoming") as Meeting["status"],
        scPrepItems: prepCol ? cellValue(row, prepCol) ?? "" : "",
        agendaSummary: agendaCol ? cellValue(row, agendaCol) ?? "" : "",
        customerDeliverables: delivCol ? cellValue(row, delivCol) ?? "" : "",
        notes: notesCol ? cellValue(row, notesCol) ?? "" : "",
        actionItemsLogged: actionCol ? cellValue(row, actionCol) === "true" : false,
        recapSent: recapCol ? cellValue(row, recapCol) === "true" : false,
      }));
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

