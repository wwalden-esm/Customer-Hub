import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getProjectById, getSmartsheetConfig } from "@/lib/smartsheet-data";
import { getSheet, columnIdMap, updateRows } from "@/lib/smartsheet";

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

  const sheet = await getSheet(config.meetingTrackerSheetId);
  const cols = columnIdMap(sheet);
  const recapCol = cols.get("Recap Sent?");
  if (!recapCol) {
    return NextResponse.json({ error: "Recap Sent? column not found" }, { status: 422 });
  }

  const row = sheet.rows.find((r) => r.id === Number(meetingId));
  if (!row) {
    return NextResponse.json({ error: "Meeting not found" }, { status: 404 });
  }

  await updateRows(config.meetingTrackerSheetId, [
    { id: Number(meetingId), cells: [{ columnId: recapCol, value: true }] },
  ]);

  return NextResponse.json({ ok: true });
}
