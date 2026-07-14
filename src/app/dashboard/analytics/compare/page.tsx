import { auth } from "@/lib/auth";
import {
  getProjectList,
  getSmartsheetConfig,
  getProjectMilestones,
  getProjectActionItems,
  getRaidLogItems,
  getProjectMeetings,
  getProjectDocuments,
} from "@/lib/smartsheet-data";
import {
  computeHealthScore,
  loadHealthHistory,
  getProjectHistory,
} from "@/lib/health-score";
import DashboardBreadcrumb from "@/components/dashboard/DashboardBreadcrumb";
import CompareView from "@/components/dashboard/CompareView";

export const dynamic = "force-dynamic";

export default async function ComparePage() {
  const session = await auth();
  const allProjects = getProjectList();

  const userEmail = session?.user?.email || "";
  const userRole = session?.user?.role || "SC";

  const projects = userRole === "ADMIN"
    ? allProjects
    : allProjects.filter((p) => p.scEmail === userEmail || p.pmEmail === userEmail);

  const history = loadHealthHistory();

  const projectAnalytics = await Promise.all(
    projects.map(async (project) => {
      const config = getSmartsheetConfig(project.id);
      const [milestones, actionItems, raidItems, meetings, documents] = await Promise.all([
        config.projectPlanSheetId ? getProjectMilestones(config.projectPlanSheetId) : Promise.resolve([]),
        config.actionItemSheetId ? getProjectActionItems(config.actionItemSheetId) : Promise.resolve([]),
        config.raidLogSheetId ? getRaidLogItems(config.raidLogSheetId) : Promise.resolve([]),
        config.meetingTrackerSheetId ? getProjectMeetings(config.meetingTrackerSheetId) : Promise.resolve([]),
        config.documentSheetId ? getProjectDocuments(config.documentSheetId) : Promise.resolve([]),
      ]);
      const projectHistory = getProjectHistory(project.id, history);
      return computeHealthScore(project, milestones, actionItems, raidItems, meetings, documents, config, projectHistory);
    })
  );

  return (
    <div>
      <DashboardBreadcrumb items={[{ label: "Analytics", href: "/dashboard/analytics" }, { label: "Compare" }]} />
      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="mb-6">
          <h1 className="text-xl font-semibold text-esm-black">Compare Projects</h1>
          <p className="text-sm text-esm-grey mt-1">
            Side-by-side comparison of project health and metrics
          </p>
        </div>
        <CompareView allProjects={projectAnalytics} />
      </div>
    </div>
  );
}
