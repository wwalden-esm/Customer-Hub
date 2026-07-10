import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getProjectById, getSmartsheetConfig } from "@/lib/smartsheet-data";
import { getSheet, columnIdMap, cellValue, updateRows } from "@/lib/smartsheet";
import type { SsCell } from "@/lib/smartsheet";
import { parseLocalDate } from "@/lib/date-utils";

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
  const dateCol = cols.get("Meeting Date");
  if (!statusCol) {
    return NextResponse.json({ error: "Status column not found" }, { status: 422 });
  }

  const rowIndex = sheet.rows.findIndex((r) => r.id === Number(meetingId));
  if (rowIndex === -1) {
    return NextResponse.json({ error: "Meeting not found" }, { status: 404 });
  }

  const rowUpdates: { id: number; cells: SsCell[] }[] = [
    { id: Number(meetingId), cells: [{ columnId: statusCol, value: newStatus }] },
  ];

  // When skipping, push this meeting and all subsequent meetings forward by 1 week
  const shiftedDates: Record<string, string> = {};
  if (newStatus === "Skipped" && dateCol) {
    for (let i = rowIndex; i < sheet.rows.length; i++) {
      const row = sheet.rows[i];
      const dateStr = cellValue(row, dateCol);
      if (!dateStr) continue;

      const date = parseLocalDate(dateStr);
      date.setDate(date.getDate() + 7);

      // Preserve time if present (e.g. "2026-08-04T14:30:00")
      const hasTime = dateStr.includes("T");
      const timePart = hasTime ? dateStr.slice(dateStr.indexOf("T")) : "";
      const pad = (n: number) => String(n).padStart(2, "0");
      const newDateStr = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}${timePart}`;

      shiftedDates[String(row.id)] = newDateStr;

      if (i === rowIndex) {
        rowUpdates[0].cells.push({ columnId: dateCol, value: newDateStr });
      } else {
        rowUpdates.push({
          id: row.id,
          cells: [{ columnId: dateCol, value: newDateStr }],
        });
      }
    }
  }

  await updateRows(config.meetingTrackerSheetId, rowUpdates);

  return NextResponse.json({ ok: true, status: newStatus, shiftedDates });
}
