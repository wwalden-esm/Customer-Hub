import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getProjectById, getSmartsheetConfig } from "@/lib/smartsheet-data";
import { getSheet, columnIdMap, updateRows } from "@/lib/smartsheet";

const VALID_STATUSES = ["Upcoming", "Scheduled", "Complete", "Skipped"] as const;

export async function PATCH(
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

  const body = await req.json();
  const newStatus: string = body.status ?? "";
  if (!VALID_STATUSES.includes(newStatus as (typeof VALID_STATUSES)[number])) {
    return NextResponse.json(
      { error: `Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}` },
      { status: 400 },
    );
  }

  const sheet = await getSheet(config.meetingTrackerSheetId);
  const cols = columnIdMap(sheet);
  const statusCol = cols.get("Status");
  if (!statusCol) {
    return NextResponse.json({ error: "Status column not found" }, { status: 422 });
  }

  const row = sheet.rows.find((r) => r.id === Number(meetingId));
  if (!row) {
    return NextResponse.json({ error: "Meeting not found" }, { status: 404 });
  }

  await updateRows(config.meetingTrackerSheetId, [
    { id: Number(meetingId), cells: [{ columnId: statusCol, value: newStatus }] },
  ]);

  return NextResponse.json({ ok: true, status: newStatus });
}
