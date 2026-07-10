import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getProjectById, getSmartsheetConfig } from "@/lib/smartsheet-data";
import { getSheet, columnIdMap, addRows } from "@/lib/smartsheet";
import { generateMeetingSchedule } from "@/lib/meeting-schedule";
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
    return NextResponse.json({ error: "No meeting tracker sheet configured" }, { status: 422 });
  }

  if (!project.startDate || !project.goLiveDate) {
    return NextResponse.json({ error: "Project must have start and go-live dates" }, { status: 422 });
  }

  const body = await req.json();
  const meetingDay = typeof body.meetingDay === "number" ? body.meetingDay : 2; // default Tuesday

  const meetings = generateMeetingSchedule(project.startDate, project.goLiveDate, meetingDay);

  const sheet = await getSheet(config.meetingTrackerSheetId);
  const cols = columnIdMap(sheet);

  const colMap: Record<string, number | undefined> = {
    week: cols.get("Week"),
    days: cols.get("Days"),
    phase: cols.get("Phase"),
    milestone: cols.get("Milestone"),
    meetingDate: cols.get("Meeting Date"),
    status: cols.get("Status"),
    scPrepItems: cols.get("SC Prep Items"),
    agendaSummary: cols.get("Agenda Summary (90 min)"),
    customerDeliverables: cols.get("Customer Deliverables Due"),
    notes: cols.get("Watch-Out / Notes"),
  };

  const rows = meetings.map((m) => {
    const cells: SsCell[] = [];
    if (colMap.week) cells.push({ columnId: colMap.week, value: m.week });
    if (colMap.days) cells.push({ columnId: colMap.days, value: m.days });
    if (colMap.phase) cells.push({ columnId: colMap.phase, value: m.phase });
    if (colMap.milestone) cells.push({ columnId: colMap.milestone, value: m.milestone });
    if (colMap.meetingDate) cells.push({ columnId: colMap.meetingDate, value: m.meetingDate });
    if (colMap.status) cells.push({ columnId: colMap.status, value: m.status });
    if (colMap.scPrepItems) cells.push({ columnId: colMap.scPrepItems, value: m.scPrepItems });
    if (colMap.agendaSummary) cells.push({ columnId: colMap.agendaSummary, value: m.agendaSummary });
    if (colMap.customerDeliverables) cells.push({ columnId: colMap.customerDeliverables, value: m.customerDeliverables });
    if (colMap.notes) cells.push({ columnId: colMap.notes, value: m.notes });
    return { cells };
  });

  await addRows(config.meetingTrackerSheetId, rows);

  return NextResponse.json({
    generated: meetings.length,
    phases: Array.from(new Set(meetings.map((m) => m.phase))),
    execMeetings: meetings.filter((m) => m.milestone).length,
  });
}
