import { notFound } from "next/navigation";
import { getProjectById, getSmartsheetConfig, getProjectMeetings } from "@/lib/smartsheet-data";
import MeetingManagement from "@/components/dashboard/MeetingManagement";
import DashboardBreadcrumb from "@/components/dashboard/DashboardBreadcrumb";

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
    <div>
      <DashboardBreadcrumb
        items={[
          { label: project.customerName, href: `/dashboard/${project.id}` },
          { label: "Meetings" },
        ]}
      />
      <div className="max-w-7xl mx-auto px-6 py-6">
        <h1 className="text-xl font-semibold text-esm-black mb-1">Meeting Management</h1>
        <p className="text-sm text-esm-grey mb-6">{project.customerName} — Log action items and send recaps</p>
        <MeetingManagement meetings={meetings} projectId={project.id} />
      </div>
    </div>
  );
}
