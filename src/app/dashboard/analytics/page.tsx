import { auth } from "@/lib/auth";
import {
  getProjectList,
  getSmartsheetConfig,
  getProjectMilestones,
  getProjectActionItems,
  getRaidLogItems,
} from "@/lib/smartsheet-data";
import { computeHealthScore, computePortfolioAnalytics } from "@/lib/health-score";
import DashboardBreadcrumb from "@/components/dashboard/DashboardBreadcrumb";
import AnalyticsDashboard from "@/components/dashboard/AnalyticsDashboard";

export const dynamic = "force-dynamic";

export default async function AnalyticsPage() {
  const session = await auth();
  const allProjects = getProjectList();

  const userEmail = session?.user?.email || "";
  const userRole = session?.user?.role || "SC";

  const projects = userRole === "ADMIN"
    ? allProjects
    : allProjects.filter((p) => p.scEmail === userEmail || p.pmEmail === userEmail);

  const projectAnalytics = await Promise.all(
    projects.map(async (project) => {
      const config = getSmartsheetConfig(project.id);
      const [milestones, actionItems, raidItems] = await Promise.all([
        config.projectPlanSheetId ? getProjectMilestones(config.projectPlanSheetId) : Promise.resolve([]),
        config.actionItemSheetId ? getProjectActionItems(config.actionItemSheetId) : Promise.resolve([]),
        config.raidLogSheetId ? getRaidLogItems(config.raidLogSheetId) : Promise.resolve([]),
      ]);
      return computeHealthScore(project, milestones, actionItems, raidItems);
    })
  );

  const portfolio = computePortfolioAnalytics(projectAnalytics);

  return (
    <div>
      <DashboardBreadcrumb items={[{ label: "Analytics" }]} />
      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="mb-6">
          <h1 className="text-xl font-semibold text-esm-black">
            Portfolio Health & Analytics
          </h1>
          <p className="text-sm text-esm-grey mt-1">
            Predictive health scoring across {portfolio.summary.totalProjects} active project{portfolio.summary.totalProjects === 1 ? "" : "s"}
          </p>
        </div>
        <AnalyticsDashboard portfolio={portfolio} />
      </div>
    </div>
  );
}
