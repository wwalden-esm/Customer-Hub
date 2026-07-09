import { NextRequest, NextResponse } from "next/server";
import { getCustomerSession } from "@/lib/magic-link";
import { getSmartsheetConfig } from "@/lib/smartsheet-data";
import { getSheet, columnIdMap, updateRows } from "@/lib/smartsheet";

const ALLOWED_STATUSES = ["open", "in-progress", "complete", "done"];

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> },
) {
  const session = await getCustomerSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, itemId } = await params;
  if (session.projectId !== id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const config = getSmartsheetConfig(id);
  if (!config.actionItemSheetId) {
    return NextResponse.json({ error: "Action items not configured" }, { status: 404 });
  }

  const body = await req.json();
  const newStatus = typeof body.status === "string" ? body.status.toLowerCase() : null;
  if (!newStatus || !ALLOWED_STATUSES.includes(newStatus)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const sheet = await getSheet(config.actionItemSheetId);
  const cols = columnIdMap(sheet);
  const statusCol = cols.get("Status");
  if (!statusCol) {
    return NextResponse.json({ error: "Status column not found" }, { status: 500 });
  }

  const rowId = Number(itemId);
  const row = sheet.rows.find((r) => r.id === rowId);
  if (!row) {
    return NextResponse.json({ error: "Item not found" }, { status: 404 });
  }

  const displayStatus = newStatus === "in-progress" ? "In Progress" : newStatus === "complete" || newStatus === "done" ? "Complete" : "Open";

  await updateRows(config.actionItemSheetId, [
    { id: rowId, cells: [{ columnId: statusCol, value: displayStatus }] },
  ]);

  return NextResponse.json({ ok: true, status: displayStatus });
}
