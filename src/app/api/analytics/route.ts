import { NextResponse } from "next/server";
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
  computePortfolioAnalytics,
  loadHealthHistory,
  saveHealthSnapshot,
  getProjectHistory,
} from "@/lib/health-score";

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

  saveHealthSnapshot(projectAnalytics);
  const portfolio = computePortfolioAnalytics(projectAnalytics);
  return NextResponse.json(portfolio);
}
