import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getProjectById, getSmartsheetConfig, getProjectContacts } from "@/lib/smartsheet-data";
import { getSheet, columnIdMap, updateRows, addRows, attachFileToRow } from "@/lib/smartsheet";
import type { SsCell } from "@/lib/smartsheet";
import {
  parseTranscriptFile,
  processTranscript,
  buildRecapEmailBody,
  buildEml,
} from "@/lib/transcript-recap";

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

  // Read the transcript from the request body
  const body = await req.json();
  const rawTranscript: string = body.transcript ?? "";
  if (!rawTranscript.trim()) {
    return NextResponse.json({ error: "No transcript provided" }, { status: 400 });
  }

  // Get the meeting row to identify week/date/phase
  const mtgSheet = await getSheet(config.meetingTrackerSheetId);
  const mtgCols = columnIdMap(mtgSheet);
  const mtgRow = mtgSheet.rows.find((r) => r.id === Number(meetingId));
  if (!mtgRow) {
    return NextResponse.json({ error: "Meeting not found" }, { status: 404 });
  }

  const mtgVal = (colName: string) => {
    const colId = mtgCols.get(colName);
    if (!colId) return "";
    const cell = mtgRow.cells.find((c) => c.columnId === colId);
    return cell?.displayValue ?? String(cell?.value ?? "");
  };

  const meetingWeek = mtgVal("Week");
  const meetingDate = mtgVal("Meeting Date");

  // Parse subtitle formats (SRT/VTT) into plain text
  const transcript = rawTranscript.includes("-->") ? parseTranscriptFile(rawTranscript) : rawTranscript;

  // Process with Claude
  let recap;
  try {
    recap = await processTranscript(
      transcript,
      project.customerName,
      meetingWeek,
      meetingDate,
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: `Failed to process transcript: ${msg}` },
      { status: 500 },
    );
  }

  // Push RAID items to the RAID log sheet
  let raidItemsLogged = 0;
  if (config.raidLogSheetId) {
    const raidSheet = await getSheet(config.raidLogSheetId);
    const raidCols = columnIdMap(raidSheet);
    const rItemCol = raidCols.get("Item");
    const rTypeCol = raidCols.get("Type");
    const rStatusCol = raidCols.get("Status");
    const rPriorityCol = raidCols.get("Priority");
    const rDateCol = raidCols.get("Target Date");
    const rNotesCol = raidCols.get("Notes");

    // "Assigned" is a CONTACT column — only write if the value looks like an email
    const rAssignedCol = raidCols.get("Assigned");
    const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

    const raidRows: { cells: SsCell[] }[] = [];

    // Action items → RAID type "Action"
    for (const ai of recap.action_items) {
      const cells: SsCell[] = [];
      if (rItemCol) cells.push({ columnId: rItemCol, value: ai.task });
      if (rTypeCol) cells.push({ columnId: rTypeCol, value: "Action" });
      if (rStatusCol) cells.push({ columnId: rStatusCol, value: "New" });
      if (rPriorityCol) cells.push({ columnId: rPriorityCol, value: "Medium" });
      if (rAssignedCol && isEmail(ai.owner)) cells.push({ columnId: rAssignedCol, value: ai.owner });
      if (rDateCol && ai.due !== "TBD") cells.push({ columnId: rDateCol, value: ai.due });
      if (rNotesCol) cells.push({ columnId: rNotesCol, value: `Owner: ${ai.owner} | Source: ${meetingWeek} | Type: ${ai.type}` });
      raidRows.push({ cells });
    }

    // Decisions → RAID type "Decision"
    for (const d of recap.decisions) {
      const cells: SsCell[] = [];
      if (rItemCol) cells.push({ columnId: rItemCol, value: `${d.title}: ${d.description}` });
      if (rTypeCol) cells.push({ columnId: rTypeCol, value: "Decision" });
      if (rStatusCol) cells.push({ columnId: rStatusCol, value: "Complete" });
      if (rPriorityCol) cells.push({ columnId: rPriorityCol, value: "Medium" });
      if (rAssignedCol && isEmail(d.made_by)) cells.push({ columnId: rAssignedCol, value: d.made_by });
      if (rNotesCol) cells.push({ columnId: rNotesCol, value: `Made by: ${d.made_by} | Source: ${meetingWeek} | Type: ${d.type} | Impact: ${d.impact}` });
      raidRows.push({ cells });
    }

    // Risks → RAID type "Risk"
    for (const r of recap.risks) {
      const cells: SsCell[] = [];
      if (rItemCol) cells.push({ columnId: rItemCol, value: r.description });
      if (rTypeCol) cells.push({ columnId: rTypeCol, value: "Risk" });
      if (rStatusCol) cells.push({ columnId: rStatusCol, value: "New" });
      if (rPriorityCol) cells.push({ columnId: rPriorityCol, value: r.priority });
      if (rAssignedCol && isEmail(r.owner)) cells.push({ columnId: rAssignedCol, value: r.owner });
      if (rNotesCol) cells.push({ columnId: rNotesCol, value: `Owner: ${r.owner} | Source: ${meetingWeek} | Mitigation: ${r.mitigation}` });
      raidRows.push({ cells });
    }

    if (raidRows.length > 0) {
      await addRows(config.raidLogSheetId, raidRows);
      raidItemsLogged = raidRows.length;
    }
  }

  // Also push action items to the action item sheet if configured
  if (config.actionItemSheetId && recap.action_items.length > 0) {
    const aiSheet = await getSheet(config.actionItemSheetId);
    const aiCols = columnIdMap(aiSheet);
    const descCol = aiCols.get("Description") ?? aiCols.get("Action Item") ?? aiCols.get("Item");
    const ownerCol = aiCols.get("Owner") ?? aiCols.get("Assigned");
    const dueCol = aiCols.get("Due Date") ?? aiCols.get("Target Date");
    const statusCol = aiCols.get("Status");
    const sourceCol = aiCols.get("Source");

    const aiRows = recap.action_items.map((ai) => {
      const cells: SsCell[] = [];
      if (descCol) cells.push({ columnId: descCol, value: ai.task });
      if (ownerCol) cells.push({ columnId: ownerCol, value: ai.owner });
      if (dueCol && ai.due !== "TBD") cells.push({ columnId: dueCol, value: ai.due });
      if (statusCol) cells.push({ columnId: statusCol, value: "Open" });
      if (sourceCol) cells.push({ columnId: sourceCol, value: meetingWeek });
      return { cells };
    });

    await addRows(config.actionItemSheetId, aiRows);
  }

  // Mark "Action Items Logged?" on the meeting row
  const actionCol = mtgCols.get("Action Items Logged?");
  if (actionCol && recap.action_items.length > 0) {
    await updateRows(config.meetingTrackerSheetId, [
      { id: Number(meetingId), cells: [{ columnId: actionCol, value: true }] },
    ]);
  }

  // Build the .eml draft for the recap email
  const contacts = getProjectContacts(id);
  const primaryContact = contacts[0]?.name ?? "Team";
  const toEmail = contacts.map((c) => c.email).join(", ");

  const emailBody = buildRecapEmailBody(
    recap,
    primaryContact,
    meetingDate,
  );

  const subject = `Meeting Recap — ${recap.meeting_name}`;
  const emlContent = buildEml(
    toEmail,
    subject,
    emailBody,
    project!.scName,
    project!.scEmail,
  );

  // Attach recap as a text file to the meeting row in Smartsheet
  let recapAttachmentId: number | null = null;
  try {
    const recapJson = JSON.stringify(recap, null, 2);
    const buf = new TextEncoder().encode(recapJson);
    const weekSlug = meetingWeek.replace(/\s+/g, "-");
    const attachment = await attachFileToRow(
      config.meetingTrackerSheetId,
      Number(meetingId),
      `Recap-${weekSlug}.json`,
      "application/json",
      buf,
    );
    recapAttachmentId = attachment.id;
  } catch {
    // Non-fatal — recap still works via email
  }

  return NextResponse.json({
    recap,
    raidItemsLogged,
    actionItemsLogged: recap.action_items.length,
    decisionsLogged: recap.decisions.length,
    risksLogged: recap.risks.length,
    emlContent,
    meetingWeek,
    recapAttachmentId,
  });
}
