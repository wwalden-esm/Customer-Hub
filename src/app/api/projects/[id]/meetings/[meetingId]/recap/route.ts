import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getCustomerSession } from "@/lib/magic-link";
import { getProjectById, getSmartsheetConfig, getProjectMeetings } from "@/lib/smartsheet-data";
import { getAttachmentUrl } from "@/lib/smartsheet";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; meetingId: string }> },
) {
  const { id, meetingId } = await params;

  // Allow both ESM staff and customer portal access
  const esmSession = await auth();
  const customerSession = await getCustomerSession();
  if (!esmSession?.user && !customerSession) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const project = getProjectById(id);
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const config = getSmartsheetConfig(id);
  if (!config.meetingTrackerSheetId) {
    return NextResponse.json({ error: "Meeting tracker not configured" }, { status: 422 });
  }

  const meetings = await getProjectMeetings(config.meetingTrackerSheetId);
  const meeting = meetings.find((m) => m.id === meetingId);
  if (!meeting) {
    return NextResponse.json({ error: "Meeting not found" }, { status: 404 });
  }
  if (!meeting.recapAttachmentId) {
    return NextResponse.json({ error: "No recap attached" }, { status: 404 });
  }

  try {
    const { url } = await getAttachmentUrl(meeting.recapAttachmentId);
    const res = await fetch(url);
    if (!res.ok) throw new Error("Failed to download attachment");
    const recap = await res.json();
    return NextResponse.json({ recap, week: meeting.week, meetingDate: meeting.meetingDate });
  } catch {
    return NextResponse.json({ error: "Failed to load recap" }, { status: 500 });
  }
}
