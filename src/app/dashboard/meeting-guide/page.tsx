import type { Metadata } from "next";
import MeetingStructure from "@/components/hub/MeetingStructure";
import DashboardBreadcrumb from "@/components/dashboard/DashboardBreadcrumb";

export const metadata: Metadata = { title: "Meeting Guide" };

export default async function MeetingGuidePage() {
  return (
    <div>
      <DashboardBreadcrumb items={[{ label: "Meeting Guide" }]} />
      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-semibold text-esm-black">Weekly Meeting Guide</h1>
          <a
            href="/dashboard/meeting-templates"
            className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-card border border-esm-border hover:bg-gray-50 transition-colors text-esm-black"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h8m-8 6h16" />
            </svg>
            Recap Templates
          </a>
        </div>
        <MeetingStructure />
      </div>
    </div>
  );
}
