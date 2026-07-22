import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getCustomerSession } from "@/lib/magic-link";
import { logAudit } from "@/lib/audit-log";
import { createJsonStore } from "@/lib/data-store";
import { getSheet, columnIdMap, addRows } from "@/lib/smartsheet";
import type { SsCell } from "@/lib/smartsheet";
import {
  getPendingRaidItems,
  getPendingRaidItem,
  updatePendingRaidItem,
  removePendingRaidItem,
} from "@/lib/raid-pending-store";
import { addHubNotification } from "@/lib/hub-notification-store";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const projectsStore = createJsonStore<Record<string, any>>("projects", {});

function getProjectConfig(projectId: string) {
  const projects = projectsStore.load();
  return projects[projectId] ?? null;
}

// GET - fetch pending RAID items for a project (staff or customer)
export async function GET(req: NextRequest) {
  const session = await auth();
  const customerSession = await getCustomerSession();
  if (!session?.user && !customerSession) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const projectId = req.nextUrl.pathname.split("/")[3];
  const items = getPendingRaidItems(projectId);
  return NextResponse.json({ items });
}

// PATCH - approve or request changes on a pending RAID item (staff only)
export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const projectId = req.nextUrl.pathname.split("/")[3];
  const body = await req.json();
  const { itemId, action, notes } = body;

  if (!itemId || typeof itemId !== "string") {
    return NextResponse.json({ error: "Field 'itemId' is required" }, { status: 400 });
  }
  if (!action || !["approve", "request_changes"].includes(action)) {
    return NextResponse.json({ error: "Field 'action' must be 'approve' or 'request_changes'" }, { status: 400 });
  }

  const pending = getPendingRaidItem(itemId);
  if (!pending || pending.projectId !== projectId) {
    return NextResponse.json({ error: "Pending item not found" }, { status: 404 });
  }

  const reviewerName = session.user.name || session.user.email || "Staff";

  if (action === "approve") {
    const project = getProjectConfig(projectId);
    const sheetId = project?.smartsheetConfig?.raidLogSheetId;
    if (!sheetId) {
      return NextResponse.json({ error: "RAID log sheet not configured" }, { status: 404 });
    }

    try {
      const sheet = await getSheet(sheetId);
      const cols = columnIdMap(sheet);

      const cells: SsCell[] = [];
      const itemCol = cols.get("Item");
      const typeCol = cols.get("Type");
      const statusCol = cols.get("Status");
      const priorityCol = cols.get("Priority");
      const notesCol = cols.get("Notes");
      const assignedCol = cols.get("Assigned");

      if (itemCol) cells.push({ columnId: itemCol, value: pending.item });
      if (typeCol) cells.push({ columnId: typeCol, value: pending.type });
      if (statusCol) cells.push({ columnId: statusCol, value: "New" });
      if (priorityCol) cells.push({ columnId: priorityCol, value: pending.priority });
      if (notesCol && pending.notes) cells.push({ columnId: notesCol, value: pending.notes });
      if (assignedCol && pending.assigned) cells.push({ columnId: assignedCol, value: pending.assigned });

      await addRows(sheetId, [{ cells }]);
      removePendingRaidItem(itemId);

      addHubNotification(
        projectId,
        "RAID item approved",
        `Your ${pending.type.toLowerCase()} "${pending.item}" has been approved and added to the RAID log.`,
      );

      logAudit(reviewerName, "approve_raid_item", projectId, "project", `${pending.type}: ${pending.item}`);

      return NextResponse.json({ success: true, action: "approved" });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      return NextResponse.json({ error: `Failed to approve: ${msg}` }, { status: 500 });
    }
  }

  // request_changes
  updatePendingRaidItem(itemId, {
    review_status: "changes_requested",
    review_notes: notes || "",
    reviewedBy: reviewerName,
    reviewedAt: new Date().toISOString(),
  });

  addHubNotification(
    projectId,
    "RAID item needs changes",
    `Your ${pending.type.toLowerCase()} "${pending.item}" requires changes: ${notes || "No additional notes."}`,
  );

  logAudit(reviewerName, "request_changes_raid_item", projectId, "project", `${pending.type}: ${pending.item}`);

  return NextResponse.json({ success: true, action: "changes_requested" });
}
