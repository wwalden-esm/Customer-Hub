import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getProjectById, getSmartsheetConfig, getProjectContacts } from "@/lib/smartsheet-data";
import { getSheet, columnIdMap, updateRows } from "@/lib/smartsheet";
import { sendNotificationEmail } from "@/lib/email";

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
  const mtgRow = sheet.rows.find((r) => r.id === Number(meetingId));
  if (!mtgRow) {
    return NextResponse.json({ error: "Meeting not found" }, { status: 404 });
  }

  const val = (colName: string) => {
    const colId = cols.get(colName);
    if (!colId) return "";
    const cell = mtgRow.cells.find((c) => c.columnId === colId);
    return cell?.displayValue ?? String(cell?.value ?? "");
  };

  const week = val("Week");
  const phase = val("Phase");
  const agenda = val("Agenda Summary (90 min)");
  const deliverables = val("Customer Deliverables Due");
  const notes = val("Watch-Out / Notes");
  const meetingDate = val("Meeting Date");

  const body = await req.json();
  const actionItemsSummary: string = body.actionItems ?? "";
  const additionalNotes: string = body.notes ?? "";

  // Build recipient list: customer contacts + SC
  const contacts = getProjectContacts(id);
  const recipients = contacts.map((c) => c.email);
  if (project.scEmail && !recipients.includes(project.scEmail)) {
    recipients.push(project.scEmail);
  }
  if (project.pmEmail && !recipients.includes(project.pmEmail)) {
    recipients.push(project.pmEmail);
  }

  if (recipients.length === 0) {
    return NextResponse.json({ error: "No recipients configured" }, { status: 422 });
  }

  const subject = `${project.customerName} — ${week} Meeting Recap`;
  const html = buildRecapHtml({
    customerName: project.customerName,
    week,
    phase,
    meetingDate,
    agenda,
    deliverables,
    notes,
    actionItemsSummary,
    additionalNotes,
    scName: project.scName,
  });

  const sent: string[] = [];
  const errors: string[] = [];
  for (const to of recipients) {
    try {
      await sendNotificationEmail(to, subject, html);
      sent.push(to);
    } catch {
      errors.push(to);
    }
  }

  // Mark "Recap Sent?" as true
  const recapCol = cols.get("Recap Sent?");
  if (recapCol) {
    await updateRows(config.meetingTrackerSheetId, [
      { id: Number(meetingId), cells: [{ columnId: recapCol, value: true }] },
    ]);
  }

  return NextResponse.json({ ok: true, sent: sent.length, errors: errors.length });
}

function buildRecapHtml(data: {
  customerName: string;
  week: string;
  phase: string;
  meetingDate: string;
  agenda: string;
  deliverables: string;
  notes: string;
  actionItemsSummary: string;
  additionalNotes: string;
  scName: string;
}): string {
  const section = (title: string, content: string) =>
    content
      ? `<tr><td style="padding:12px 24px 4px;font-size:13px;font-weight:bold;color:#686468;text-transform:uppercase;letter-spacing:0.05em;">${title}</td></tr>
         <tr><td style="padding:4px 24px 16px;font-size:14px;color:#1A1718;white-space:pre-wrap;">${content}</td></tr>`
      : "";

  return `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto;">
      <div style="background:#F4333F;padding:16px 24px;border-radius:8px 8px 0 0;">
        <span style="color:white;font-weight:bold;font-size:18px;">ESM Customer Hub</span>
      </div>
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff;border:1px solid #e5e7eb;border-top:0;">
        <tr>
          <td style="padding:24px 24px 8px;">
            <h2 style="margin:0;font-size:18px;color:#1A1718;">${data.customerName} — ${data.week} Recap</h2>
            <p style="margin:4px 0 0;font-size:13px;color:#686468;">${data.phase}${data.meetingDate ? ` · ${data.meetingDate}` : ""}</p>
          </td>
        </tr>
        ${section("Agenda Covered", data.agenda)}
        ${section("Action Items", data.actionItemsSummary)}
        ${section("Upcoming Customer Deliverables", data.deliverables)}
        ${section("Notes & Watch-Outs", data.notes)}
        ${section("Additional Notes", data.additionalNotes)}
        <tr>
          <td style="padding:16px 24px 24px;font-size:13px;color:#686468;border-top:1px solid #e5e7eb;">
            Sent by ${data.scName} via ESM Customer Hub
          </td>
        </tr>
      </table>
    </div>
  `;
}
