import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { loadMeetingTemplates } from "@/lib/meeting-templates";
import DashboardBreadcrumb from "@/components/dashboard/DashboardBreadcrumb";
import MeetingTemplatesEditor from "@/components/dashboard/MeetingTemplatesEditor";

export const dynamic = "force-dynamic";

export default async function MeetingTemplatesPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const templates = loadMeetingTemplates();

  return (
    <div>
      <DashboardBreadcrumb items={[{ label: "Meeting Guide", href: "/dashboard/meeting-guide" }, { label: "Templates" }]} />
      <div className="max-w-4xl mx-auto px-6 py-6">
        <div className="mb-6">
          <h1 className="text-xl font-semibold text-esm-black">Meeting Recap Templates</h1>
          <p className="text-sm text-esm-grey mt-1">
            Configure meeting types and their agenda sections for structured recaps
          </p>
        </div>
        <MeetingTemplatesEditor initialTemplates={templates} />
      </div>
    </div>
  );
}
