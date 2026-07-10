import Link from "next/link";
import { notFound } from "next/navigation";
import { getProjectById, getSmartsheetConfig, getProjectMeetings } from "@/lib/smartsheet-data";
import MeetingManagement from "@/components/dashboard/MeetingManagement";

export default async function MeetingsManagementPage({
  params,
}: {
  params: { projectId: string };
}) {
  const project = getProjectById(params.projectId);
  if (!project) notFound();

  const config = getSmartsheetConfig(params.projectId);
  const meetings = config.meetingTrackerSheetId
    ? await getProjectMeetings(config.meetingTrackerSheetId)
    : [];

  return (
    <main className="min-h-screen bg-esm-grey-light">
      <div className="bg-white border-b border-esm-border">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center gap-2 text-sm text-esm-grey mb-2">
            <Link href="/dashboard" className="hover:text-esm-black">Dashboard</Link>
            <span>/</span>
            <Link href={`/dashboard/${project.id}`} className="hover:text-esm-black">{project.customerName}</Link>
            <span>/</span>
            <span className="text-esm-black">Meetings</span>
          </div>
          <h1 className="text-xl font-semibold text-esm-black">Meeting Management</h1>
          <p className="text-sm text-esm-grey mt-1">{project.customerName} — Log action items and send recaps</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">
        <MeetingManagement meetings={meetings} projectId={project.id} />
      </div>
    </main>
  );
}
