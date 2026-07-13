import { auth } from "@/lib/auth";
import { parseLocalDate } from "@/lib/date-utils";
import { getProjectList, getSmartsheetConfig, getProjectMilestones, deriveCurrentPhase } from "@/lib/smartsheet-data";
import SyncHubSpotButton from "@/components/dashboard/SyncHubSpotButton";
import SendNotificationsButton from "@/components/dashboard/SendNotificationsButton";
import SyncStatusBar from "@/components/dashboard/SyncStatusBar";
import ProjectTable from "@/components/dashboard/ProjectTable";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await auth();
  const allProjects = getProjectList();
  const dataTimestamp = new Date().toISOString();

  const userEmail = session?.user?.email || "";
  const userRole = session?.user?.role || "SC";

  const projects = userRole === "ADMIN"
    ? allProjects
    : allProjects.filter((p) => p.scEmail === userEmail || p.pmEmail === userEmail);

  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const projectRows = await Promise.all(projects.map(async (p) => {
    const cfg = getSmartsheetConfig(p.id);
    const milestones = cfg.projectPlanSheetId
      ? await getProjectMilestones(cfg.projectPlanSheetId)
      : [];
    const daysToGoLive = p.goLiveDate
      ? Math.ceil((parseLocalDate(p.goLiveDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      : null;
    return {
      id: p.id,
      customerName: p.customerName,
      projectName: p.projectName,
      scName: p.scName,
      pmName: p.pmName,
      goLiveDate: p.goLiveDate,
      status: p.status,
      currentPhase: deriveCurrentPhase(milestones, p.currentPhase),
      hasSheets: !!cfg.workspaceId,
      daysToGoLive,
    };
  }));

  return (
    <div className="max-w-7xl mx-auto px-6 py-6">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <SyncHubSpotButton />
          <SendNotificationsButton />
        </div>
        <SyncStatusBar dataTimestamp={dataTimestamp} />
      </div>
      <ProjectTable projects={projectRows} />
    </div>
  );
}
