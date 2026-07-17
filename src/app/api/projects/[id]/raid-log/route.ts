import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getCustomerSession } from "@/lib/magic-link";
import { logAudit } from "@/lib/audit-log";
import fs from "fs";
import path from "path";
import { getSheet, columnIdMap, addRows, updateRows } from "@/lib/smartsheet";
import type { SsCell } from "@/lib/smartsheet";
import { getRaidLogItems } from "@/lib/smartsheet-data";
import { addPendingRaidItem, getPendingRaidItems } from "@/lib/raid-pending-store";
import { addHubNotification } from "@/lib/hub-notification-store";
import { isRaidSubmissionAllowed } from "@/lib/settings";

const configPath = path.join(process.cwd(), "config", "projects.json");

function getProjectConfig(projectId: string) {
  const projects = JSON.parse(fs.readFileSync(configPath, "utf-8"));
  return projects[projectId] ?? null;
}

const VALID_TYPES = ["Risk", "Action", "Issue", "Decision"] as const;
const VALID_STATUSES = ["New", "In Progress", "Blocked", "Complete"] as const;
const VALID_PRIORITIES = ["High", "Medium", "Low"] as const;

// ---------------------------------------------------------------------------
// GET  - fetch all RAID log items
// ---------------------------------------------------------------------------
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const projectId = req.nextUrl.pathname.split("/")[3];
  const project = getProjectConfig(projectId);
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const sheetId = project.smartsheetConfig?.raidLogSheetId;
  if (!sheetId) {
    return NextResponse.json({ error: "RAID log sheet not configured" }, { status: 404 });
  }

  try {
    const items = await getRaidLogItems(sheetId);
    return NextResponse.json({ items });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: `Failed to fetch RAID log: ${msg}` }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// POST - create a new RAID log item
// ---------------------------------------------------------------------------
export async function POST(req: NextRequest) {
  const session = await auth();
  const customerSession = await getCustomerSession();
  if (!session?.user && !customerSession) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const projectId = req.nextUrl.pathname.split("/")[3];
  const project = getProjectConfig(projectId);
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const sheetId = project.smartsheetConfig?.raidLogSheetId;
  if (!sheetId) {
    return NextResponse.json({ error: "RAID log sheet not configured" }, { status: 404 });
  }

  const body = await req.json();
  const { item, type, status, priority, notes, assigned, targetDate, itemId } = body;

  if (!item || typeof item !== "string" || !item.trim()) {
    return NextResponse.json({ error: "Field 'item' is required" }, { status: 400 });
  }
  if (!type || !VALID_TYPES.includes(type)) {
    return NextResponse.json(
      { error: `Field 'type' must be one of: ${VALID_TYPES.join(", ")}` },
      { status: 400 },
    );
  }

  const actorName = customerSession?.name || session?.user?.name || "Unknown";

  // Customer submissions go through approval; staff submissions go directly to Smartsheet
  if (customerSession) {
    if (!isRaidSubmissionAllowed(project.allowCustomerRaidSubmissions)) {
      return NextResponse.json({ error: "RAID submissions are not enabled for this project" }, { status: 403 });
    }
    try {
      const pending = addPendingRaidItem(projectId, {
        type: type as "Risk" | "Action" | "Issue" | "Decision",
        item: item.trim(),
        notes: notes || "",
        priority: priority && VALID_PRIORITIES.includes(priority) ? priority : "Medium",
        assigned: assigned || "",
        submittedBy: actorName,
      });

      logAudit(actorName, "submit_raid_item", projectId, "project", `${type}: ${item.trim()} (pending approval)`);

      return NextResponse.json({ success: true, pending: true, item: pending }, { status: 201 });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      return NextResponse.json({ error: `Failed to submit RAID item: ${msg}` }, { status: 500 });
    }
  }

  try {
    const sheet = await getSheet(sheetId);
    const cols = columnIdMap(sheet);

    const cells: SsCell[] = [];

    const itemIdCol = cols.get("Item ID");
    const itemCol = cols.get("Item");
    const typeCol = cols.get("Type");
    const statusCol = cols.get("Status");
    const priorityCol = cols.get("Priority");
    const notesCol = cols.get("Notes");
    const assignedCol = cols.get("Assigned");
    const dateCol = cols.get("Target Date");

    if (itemIdCol && itemId) cells.push({ columnId: itemIdCol, value: itemId });
    if (itemCol) cells.push({ columnId: itemCol, value: item.trim() });
    if (typeCol) cells.push({ columnId: typeCol, value: type });
    const effectiveStatus = status && VALID_STATUSES.includes(status) ? status : "New";
    if (statusCol) cells.push({ columnId: statusCol, value: effectiveStatus });
    if (priorityCol) cells.push({ columnId: priorityCol, value: priority && VALID_PRIORITIES.includes(priority) ? priority : "Medium" });
    if (notesCol && notes) cells.push({ columnId: notesCol, value: notes });
    if (assignedCol && assigned) cells.push({ columnId: assignedCol, value: assigned });
    if (dateCol && targetDate) cells.push({ columnId: dateCol, value: targetDate });

    const result = await addRows(sheetId, [{ cells }]);

    logAudit(actorName, "submit_raid_item", projectId, "project", `${type}: ${item.trim()}`);

    return NextResponse.json({ success: true, result, item: { item: item.trim(), type, status: effectiveStatus, priority: priority || "Medium", notes, assigned } }, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: `Failed to create RAID item: ${msg}` }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// PATCH - update an existing RAID log item
// ---------------------------------------------------------------------------
export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const projectId = req.nextUrl.pathname.split("/")[3];
  const project = getProjectConfig(projectId);
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const sheetId = project.smartsheetConfig?.raidLogSheetId;
  if (!sheetId) {
    return NextResponse.json({ error: "RAID log sheet not configured" }, { status: 404 });
  }

  const body = await req.json();
  const { rowId, status, notes, assigned, targetDate, priority } = body;

  if (!rowId || typeof rowId !== "number") {
    return NextResponse.json({ error: "Field 'rowId' (number) is required" }, { status: 400 });
  }

  try {
    const sheet = await getSheet(sheetId);
    const cols = columnIdMap(sheet);

    const cells: SsCell[] = [];

    if (status !== undefined) {
      if (!VALID_STATUSES.includes(status)) {
        return NextResponse.json(
          { error: `Field 'status' must be one of: ${VALID_STATUSES.join(", ")}` },
          { status: 400 },
        );
      }
      const col = cols.get("Status");
      if (col) cells.push({ columnId: col, value: status });
    }

    if (priority !== undefined) {
      if (!VALID_PRIORITIES.includes(priority)) {
        return NextResponse.json(
          { error: `Field 'priority' must be one of: ${VALID_PRIORITIES.join(", ")}` },
          { status: 400 },
        );
      }
      const col = cols.get("Priority");
      if (col) cells.push({ columnId: col, value: priority });
    }

    if (notes !== undefined) {
      const col = cols.get("Notes");
      if (col) cells.push({ columnId: col, value: notes });
    }

    if (assigned !== undefined) {
      const col = cols.get("Assigned");
      if (col) cells.push({ columnId: col, value: assigned });
    }

    if (targetDate !== undefined) {
      const col = cols.get("Target Date");
      if (col) cells.push({ columnId: col, value: targetDate });
    }

    if (cells.length === 0) {
      return NextResponse.json({ error: "No updatable fields provided" }, { status: 400 });
    }

    const result = await updateRows(sheetId, [{ id: rowId, cells }]);
    return NextResponse.json({ success: true, result });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: `Failed to update RAID item: ${msg}` }, { status: 500 });
  }
}
