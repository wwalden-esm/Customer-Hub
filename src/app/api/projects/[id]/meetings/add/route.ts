import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getProjectById, getSmartsheetConfig } from "@/lib/smartsheet-data";
import { getSheet, columnIdMap, addRows } from "@/lib/smartsheet";
import type { SsCell } from "@/lib/smartsheet";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const project = getProjectById(id);
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const config = getSmartsheetConfig(id);
  if (!config.meetingTrackerSheetId) {
    return NextResponse.json({ error: "Meeting tracker not configured" }, { status: 422 });
  }

  const body = await req.json();
  const title: string = body.title?.trim() ?? "";
  const meetingDate: string = body.meetingDate ?? "";
  const meetingTime: string = body.meetingTime ?? "";
  const phase: string = body.phase?.trim() ?? "";
  const agenda: string = body.agenda?.trim() ?? "";
  const notes: string = body.notes?.trim() ?? "";

  if (!title) {
    return NextResponse.json({ error: "Meeting title is required" }, { status: 400 });
  }
  if (!meetingDate) {
    return NextResponse.json({ error: "Meeting date is required" }, { status: 400 });
  }

  const sheet = await getSheet(config.meetingTrackerSheetId);
  const cols = columnIdMap(sheet);

  const dateStr = meetingTime ? `${meetingDate}T${meetingTime}:00` : meetingDate;

  const cells: SsCell[] = [];
  const set = (col: string, value: string | boolean) => {
    const colId = cols.get(col);
    if (colId && value !== "") cells.push({ columnId: colId, value });
  };

  set("Week", title);
  set("Meeting Date", dateStr);
  set("Phase", phase);
  set("Status", "Scheduled");
  set("Agenda Summary (90 min)", agenda);
  set("Watch-Out / Notes", notes);

  const rows = await addRows(config.meetingTrackerSheetId, [{ cells }]);
  const newRowId = rows[0]?.id ?? null;

  return NextResponse.json({
    ok: true,
    meeting: {
      id: String(newRowId),
      week: title,
      days: "",
      phase,
      milestone: "",
      meetingDate: dateStr,
      status: "Scheduled",
      scPrepItems: "",
      agendaSummary: agenda,
      customerDeliverables: "",
      notes,
      actionItemsLogged: false,
      recapSent: false,
    },
  });
}
