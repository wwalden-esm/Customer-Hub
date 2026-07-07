import { auth, signOut } from "@/lib/auth";
import { getProjectList, getSmartsheetConfig } from "@/lib/smartsheet-data";
import { getGlobalLinks } from "@/lib/settings";
import SyncHubSpotButton from "@/components/dashboard/SyncHubSpotButton";
import SyncStatusBar from "@/components/dashboard/SyncStatusBar";
// LinkSheetsButton imported by ProjectTable directly
import ProjectTable from "@/components/dashboard/ProjectTable";
import GlobalLinksEditor from "@/components/dashboard/GlobalLinksEditor";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await auth();
  const allProjects = getProjectList();
  const globalLinks = getGlobalLinks();
  const dataTimestamp = new Date().toISOString();

  const userEmail = session?.user?.email || "";
  const userRole = session?.user?.role || "SC";

  const projects = userRole === "ADMIN"
    ? allProjects
    : allProjects.filter((p) => p.scEmail === userEmail || p.pmEmail === userEmail);

  const projectRows = projects.map((p) => ({
    id: p.id,
    customerName: p.customerName,
    projectName: p.projectName,
    scName: p.scName,
    pmName: p.pmName,
    goLiveDate: p.goLiveDate,
    status: p.status,
    currentPhase: p.currentPhase,
    hasSheets: !!getSmartsheetConfig(p.id).workspaceId,
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

        <div className="mt-6">
          <GlobalLinksEditor initialLinks={globalLinks} />
        </div>
      </div>
    </main>
  );
}
