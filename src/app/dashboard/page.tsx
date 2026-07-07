import { auth, signOut } from "@/lib/auth";
import { getProjectList, getSmartsheetConfig, getProjectMilestones, deriveCurrentPhase } from "@/lib/smartsheet-data";
import SyncHubSpotButton from "@/components/dashboard/SyncHubSpotButton";
import SyncStatusBar from "@/components/dashboard/SyncStatusBar";
// LinkSheetsButton imported by ProjectTable directly
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
      ? Math.ceil((new Date(p.goLiveDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
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
    <main className="min-h-screen bg-esm-grey-light">
      <header className="bg-white border-b border-[#E2E0E1]">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-esm-red rounded flex items-center justify-center text-white text-xs font-bold">
              ESM
            </div>
            <div>
              <h1 className="text-lg font-semibold text-esm-black">Customer Hub</h1>
              <p className="text-xs text-esm-grey">
                {userEmail} ({userRole})
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <a href="/dashboard/settings" className="text-sm text-esm-grey hover:text-esm-black">
              Settings
            </a>
            <a href="/dashboard/users" className="text-sm text-esm-grey hover:text-esm-black">
              Manage Users
            </a>
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/login" });
              }}
            >
              <button type="submit" className="text-sm text-esm-grey hover:text-esm-black">
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="mb-4 flex items-center justify-between">
          <SyncHubSpotButton />
          <SyncStatusBar dataTimestamp={dataTimestamp} />
        </div>
        <ProjectTable projects={projectRows} />
      </div>
    </main>
  );
}
