import { NextRequest, NextResponse } from "next/server";
import { logAudit } from "@/lib/audit-log";
import { addHubNotification } from "@/lib/hub-notification-store";
import { getProjectList, getSmartsheetConfig } from "@/lib/smartsheet-data";
import { ssFetch } from "@/lib/smartsheet";
import type { SsCell } from "@/lib/smartsheet";
import type { SmartsheetConfig } from "@/types/models";

// ---------------------------------------------------------------------------
// Types for Smartsheet webhook payloads
// ---------------------------------------------------------------------------

interface SmartsheetWebhookEvent {
  objectType: string; // "row", "column", "comment", "attachment"
  eventType: string;  // "created", "updated", "deleted"
  id: number;
  rowId?: number;
  columnId?: number;
}

interface SmartsheetWebhookPayload {
  nonce?: string;
  timestamp?: string;
  webhookId?: number;
  scope?: string;
  scopeObjectId?: number;
  events?: SmartsheetWebhookEvent[];
  challenge?: string;
  newWebhookStatus?: string;
}

type SheetType = "milestone" | "action-item" | "raid";

interface SheetOwnership {
  projectId: string;
  projectName: string;
  sheetType: SheetType;
  sheetId: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a lookup from sheet ID -> project + sheet type for all configured projects. */
function buildSheetLookup(): Map<string, SheetOwnership> {
  const lookup = new Map<string, SheetOwnership>();
  const projects = getProjectList();

  for (const project of projects) {
    const config: SmartsheetConfig = getSmartsheetConfig(project.id);

    if (config.projectPlanSheetId) {
      lookup.set(config.projectPlanSheetId, {
        projectId: project.id,
        projectName: project.customerName,
        sheetType: "milestone",
        sheetId: config.projectPlanSheetId,
      });
    }
    if (config.actionItemSheetId) {
      lookup.set(config.actionItemSheetId, {
        projectId: project.id,
        projectName: project.customerName,
        sheetType: "action-item",
        sheetId: config.actionItemSheetId,
      });
    }
    if (config.raidLogSheetId) {
      lookup.set(config.raidLogSheetId, {
        projectId: project.id,
        projectName: project.customerName,
        sheetType: "raid",
        sheetId: config.raidLogSheetId,
      });
    }
  }

  return lookup;
}

/** Fetch a single row from a Smartsheet sheet. */
async function fetchRow(sheetId: string, rowId: number): Promise<{ id: number; cells: SsCell[] }> {
  return ssFetch<{ id: number; cells: SsCell[] }>(`/sheets/${sheetId}/rows/${rowId}`);
}

/** Fetch column metadata for a sheet (lightweight -- only columns, no rows). */
async function fetchColumns(sheetId: string): Promise<Map<string, number>> {
  const sheet = await ssFetch<{ columns: Array<{ id: number; title: string }> }>(
    `/sheets/${sheetId}?rowsModifiedSince=2099-01-01T00:00:00Z`,
  );
  const map = new Map<string, number>();
  for (const col of sheet.columns) {
    map.set(col.title, col.id);
  }
  return map;
}

/** Get a cell value from a row by column ID. */
function getCellValue(cells: SsCell[], columnId: number): string | null {
  const cell = cells.find((c) => c.columnId === columnId);
  if (!cell || cell.value == null) return null;
  return String(cell.value);
}

// ---------------------------------------------------------------------------
// Event processors
// ---------------------------------------------------------------------------

async function processMilestoneEvent(
  event: SmartsheetWebhookEvent,
  ownership: SheetOwnership,
): Promise<void> {
  if (event.objectType !== "row" || event.eventType !== "updated" || !event.rowId) {
    return;
  }

  try {
    const [cols, row] = await Promise.all([
      fetchColumns(ownership.sheetId),
      fetchRow(ownership.sheetId, event.rowId),
    ]);

    const statusColId = cols.get("Status");
    const nameColId = cols.get("Milestone / Task Name") ?? cols.get("Task");

    if (!statusColId || !nameColId) return;

    const status = getCellValue(row.cells, statusColId);
    const name = getCellValue(row.cells, nameColId) ?? "Unknown milestone";

    if (status && (status.toLowerCase() === "complete" || status.toLowerCase() === "completed")) {
      addHubNotification(
        ownership.projectId,
        "Milestone completed",
        `"${name}" has been marked as complete.`,
      );

      logAudit(
        "smartsheet-webhook",
        "milestone_completed",
        ownership.projectId,
        "notification",
        `Milestone "${name}" completed on project ${ownership.projectName}`,
      );
    }
  } catch (err) {
    console.error(
      `[webhook] Failed to process milestone event for project ${ownership.projectId}, row ${event.rowId}:`,
      err,
    );
  }
}

async function processActionItemEvent(
  event: SmartsheetWebhookEvent,
  ownership: SheetOwnership,
): Promise<void> {
  if (event.objectType !== "row" || event.eventType !== "created" || !event.rowId) {
    return;
  }

  try {
    const [cols, row] = await Promise.all([
      fetchColumns(ownership.sheetId),
      fetchRow(ownership.sheetId, event.rowId),
    ]);

    const descColId = cols.get("Description") ?? cols.get("Action Item") ?? cols.get("Item");
    const ownerColId = cols.get("Owner") ?? cols.get("Assigned");
    const dueDateColId = cols.get("Due Date") ?? cols.get("Target Date");

    const description = descColId ? getCellValue(row.cells, descColId) : null;
    const owner = ownerColId ? getCellValue(row.cells, ownerColId) : null;
    const dueDate = dueDateColId ? getCellValue(row.cells, dueDateColId) : null;

    if (!description || !description.trim()) return;

    const detailParts: string[] = [`"${description}"`];
    if (owner) detailParts.push(`Assigned to: ${owner}`);
    if (dueDate) detailParts.push(`Due: ${dueDate.split("T")[0]}`);

    addHubNotification(
      ownership.projectId,
      "New action item assigned",
      detailParts.join(" | "),
    );

    logAudit(
      "smartsheet-webhook",
      "action_item_created",
      ownership.projectId,
      "notification",
      `Action item "${description}" created on project ${ownership.projectName}`,
    );
  } catch (err) {
    console.error(
      `[webhook] Failed to process action item event for project ${ownership.projectId}, row ${event.rowId}:`,
      err,
    );
  }
}

async function processRaidEvent(
  event: SmartsheetWebhookEvent,
  ownership: SheetOwnership,
): Promise<void> {
  if (event.objectType !== "row" || !event.rowId) return;
  if (event.eventType !== "created" && event.eventType !== "updated") return;

  try {
    const [cols, row] = await Promise.all([
      fetchColumns(ownership.sheetId),
      fetchRow(ownership.sheetId, event.rowId),
    ]);

    const itemColId = cols.get("Item");
    const typeColId = cols.get("Type");
    const statusColId = cols.get("Status");
    const priorityColId = cols.get("Priority");

    const item = itemColId ? getCellValue(row.cells, itemColId) : null;
    const type = typeColId ? getCellValue(row.cells, typeColId) : null;
    const status = statusColId ? getCellValue(row.cells, statusColId) : null;
    const priority = priorityColId ? getCellValue(row.cells, priorityColId) : null;

    if (!item || !item.trim()) return;

    const raidType = type ?? "Item";
    const isNew = event.eventType === "created";

    const title = isNew
      ? `New RAID ${raidType.toLowerCase()} logged`
      : `RAID ${raidType.toLowerCase()} updated`;

    const detailParts: string[] = [`"${item}"`];
    if (status) detailParts.push(`Status: ${status}`);
    if (priority) detailParts.push(`Priority: ${priority}`);

    addHubNotification(ownership.projectId, title, detailParts.join(" | "));

    logAudit(
      "smartsheet-webhook",
      isNew ? "raid_item_created" : "raid_item_updated",
      ownership.projectId,
      "notification",
      `RAID ${raidType} "${item}" ${isNew ? "created" : "updated"} on project ${ownership.projectName}`,
    );
  } catch (err) {
    console.error(
      `[webhook] Failed to process RAID event for project ${ownership.projectId}, row ${event.rowId}:`,
      err,
    );
  }
}

// ---------------------------------------------------------------------------
// Route handlers
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  const body: SmartsheetWebhookPayload = await req.json();

  // Smartsheet sends a verification request when registering a webhook.
  // Respond with the challenge to confirm the endpoint.
  if (body.challenge) {
    return NextResponse.json({ smartsheetHookResponse: body.challenge });
  }

  // Smartsheet webhook events
  if (body.events && Array.isArray(body.events)) {
    const scopeObjectId = String(body.scopeObjectId ?? "");

    // Audit-log every raw event (preserve existing behavior)
    for (const event of body.events) {
      const { objectType, eventType, rowId, columnId } = event;

      logAudit(
        "smartsheet-webhook",
        `webhook_${eventType}`,
        scopeObjectId,
        "project",
        `${objectType} ${eventType}${rowId ? ` row:${rowId}` : ""}${columnId ? ` col:${columnId}` : ""}`,
      );
    }

    // Identify which project and sheet type this webhook belongs to
    const sheetLookup = buildSheetLookup();
    const ownership = sheetLookup.get(scopeObjectId);

    if (ownership) {
      // Process events into hub notifications -- each event is wrapped in
      // its own try/catch inside the processor so a single failure does not
      // block the others. We collect all promises and await them together.
      const tasks: Promise<void>[] = [];

      for (const event of body.events) {
        switch (ownership.sheetType) {
          case "milestone":
            tasks.push(processMilestoneEvent(event, ownership));
            break;
          case "action-item":
            tasks.push(processActionItemEvent(event, ownership));
            break;
          case "raid":
            tasks.push(processRaidEvent(event, ownership));
            break;
        }
      }

      // Wait for all event processing but never let failures bubble up --
      // Smartsheet retries on non-200 responses.
      try {
        await Promise.allSettled(tasks);
      } catch {
        // allSettled should never throw, but guard just in case
      }
    }

    return NextResponse.json({
      ok: true,
      processed: body.events.length,
    });
  }

  // Smartsheet status callback (webhook enabled/disabled)
  if (body.newWebhookStatus) {
    logAudit(
      "smartsheet-webhook",
      "webhook_status_change",
      String(body.webhookId || "unknown"),
      "config",
      `Status: ${body.newWebhookStatus}`,
    );
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ ok: true });
}

// Smartsheet also sends HEAD requests to verify the endpoint
export async function HEAD() {
  return new NextResponse(null, { status: 200 });
}
