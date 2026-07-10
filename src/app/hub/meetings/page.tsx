import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCustomerSession } from "@/lib/magic-link";
import { getSmartsheetConfig, getProjectMeetings } from "@/lib/smartsheet-data";
import MeetingTrackerClient from "@/components/hub/MeetingTrackerClient";

export async function generateMetadata(): Promise<Metadata> {
  return { title: "Meetings" };
}

export default async function MeetingsPage() {
  const session = await getCustomerSession();
  if (!session) redirect("/hub/login");

  const config = getSmartsheetConfig(session.projectId);
  const meetings = config.meetingTrackerSheetId
    ? await getProjectMeetings(config.meetingTrackerSheetId)
    : [];

  return (
    <div>
      <h1 className="text-2xl font-semibold text-esm-black mb-6">Meeting Tracker</h1>
      <MeetingTrackerClient meetings={meetings} projectId={session.projectId} />
    </div>
  );
}
