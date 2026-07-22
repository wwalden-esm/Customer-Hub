import { loadMeetingTemplates } from "@/lib/meeting-templates";
import MeetingGuideCards from "./MeetingGuideCards";
import DashboardBreadcrumb from "@/components/dashboard/DashboardBreadcrumb";

export const dynamic = "force-dynamic";

export default async function MeetingGuidePage() {
  const templates = loadMeetingTemplates();

  return (
    <div>
      <DashboardBreadcrumb items={[{ label: "Meeting Guide" }]} />
      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="mb-6">
          <h1 className="text-xl font-semibold text-esm-black">Meeting Guide</h1>
          <p className="text-sm text-esm-grey mt-1">
            Reference templates for preparing implementation meetings
          </p>
        </div>
        <MeetingGuideCards templates={templates} />
      </div>
    </div>
  );
}
