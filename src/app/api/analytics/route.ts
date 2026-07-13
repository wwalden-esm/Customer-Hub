import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  getProjectList,
  getSmartsheetConfig,
  getProjectMilestones,
  getProjectActionItems,
  getRaidLogItems,
} from "@/lib/smartsheet-data";
import { computeHealthScore, computePortfolioAnalytics } from "@/lib/health-score";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userEmail = session.user.email || "";
  const userRole = session.user.role || "SC";

  const allProjects = getProjectList();
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
  return NextResponse.json(portfolio);
}
