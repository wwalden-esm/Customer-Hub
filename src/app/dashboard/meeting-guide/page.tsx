import { readFileSync } from "fs";
import { join } from "path";
import MeetingGuideCards from "./MeetingGuideCards";
import DashboardBreadcrumb from "@/components/dashboard/DashboardBreadcrumb";

export const dynamic = "force-dynamic";

interface MeetingSection {
  title: string;
  prompt: string;
}

interface MeetingTemplate {
  id: string;
  name: string;
  duration: number;
  sections: MeetingSection[];
}

function loadTemplates(): MeetingTemplate[] {
  try {
    const raw = readFileSync(
      join(process.cwd(), "config", "meeting-templates.json"),
      "utf-8",
    );
    const data = JSON.parse(raw);
    return data.templates || [];
  } catch {
    return [];
  }
}

export default async function MeetingGuidePage() {
  const templates = loadTemplates();

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
