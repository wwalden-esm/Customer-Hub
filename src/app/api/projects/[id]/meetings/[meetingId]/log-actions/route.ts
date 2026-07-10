import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getProjectById, getSmartsheetConfig } from "@/lib/smartsheet-data";
import { getSheet, columnIdMap, updateRows, addRows } from "@/lib/smartsheet";
import type { SsCell } from "@/lib/smartsheet";

interface ActionItemInput {
  description: string;
  owner?: string;
  dueDate?: string;
  priority?: string;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; meetingId: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, meetingId } = await params;
  const project = getProjectById(id);
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const config = getSmartsheetConfig(id);
  if (!config.meetingTrackerSheetId) {
    return NextResponse.json({ error: "Meeting tracker not configured" }, { status: 422 });
  }
  if (!config.actionItemSheetId) {
    return NextResponse.json({ error: "Action item sheet not configured" }, { status: 422 });
  }

  const body = await req.json();
  const items: ActionItemInput[] = Array.isArray(body.items) ? body.items : [];

  if (items.length === 0) {
    return NextResponse.json({ error: "No action items provided" }, { status: 400 });
  }

  // Add action items to the action item sheet
  const aiSheet = await getSheet(config.actionItemSheetId);
  const aiCols = columnIdMap(aiSheet);
  const descCol = aiCols.get("Description") ?? aiCols.get("Action Item") ?? aiCols.get("Item");
  const ownerCol = aiCols.get("Owner") ?? aiCols.get("Assigned");
  const dueCol = aiCols.get("Due Date") ?? aiCols.get("Target Date");
  const priorityCol = aiCols.get("Priority");
  const statusCol = aiCols.get("Status");
  const sourceCol = aiCols.get("Source");

  // Get meeting week for source reference
  const mtgSheet = await getSheet(config.meetingTrackerSheetId);
  const mtgCols = columnIdMap(mtgSheet);
  const mtgRow = mtgSheet.rows.find((r) => r.id === Number(meetingId));
  const weekCol = mtgCols.get("Week");
  const meetingWeek = mtgRow && weekCol
    ? mtgRow.cells.find((c) => c.columnId === weekCol)?.value ?? ""
    : "";

  const rows = items.map((item) => {
    const cells: SsCell[] = [];
    if (descCol) cells.push({ columnId: descCol, value: item.description });
    if (ownerCol && item.owner) cells.push({ columnId: ownerCol, value: item.owner });
    if (dueCol && item.dueDate) cells.push({ columnId: dueCol, value: item.dueDate });
    if (priorityCol) cells.push({ columnId: priorityCol, value: item.priority ?? "Medium" });
    if (statusCol) cells.push({ columnId: statusCol, value: "Open" });
    if (sourceCol) cells.push({ columnId: sourceCol, value: String(meetingWeek) });
    return { cells };
  });

  await addRows(config.actionItemSheetId, rows);

  // Mark the meeting's "Action Items Logged?" as true
  const actionCol = mtgCols.get("Action Items Logged?");
  if (actionCol && mtgRow) {
    await updateRows(config.meetingTrackerSheetId, [
      { id: Number(meetingId), cells: [{ columnId: actionCol, value: true }] },
    ]);
  }

  return NextResponse.json({ ok: true, logged: items.length });
}
