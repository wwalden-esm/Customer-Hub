import type { Metadata } from "next";
import MeetingStructure from "@/components/hub/MeetingStructure";
import DashboardBreadcrumb from "@/components/dashboard/DashboardBreadcrumb";

export const metadata: Metadata = { title: "Meeting Guide" };

export default async function MeetingGuidePage() {
  return (
    <div>
      <DashboardBreadcrumb items={[{ label: "Meeting Guide" }]} />
      <div className="max-w-7xl mx-auto px-6 py-6">
        <h1 className="text-xl font-semibold text-esm-black mb-6">Weekly Meeting Guide</h1>
        <MeetingStructure />
      </div>
    </div>
  );
}
