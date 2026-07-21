import Link from "next/link";
import { auth } from "@/lib/auth";
import { parseLocalDate } from "@/lib/date-utils";
import { getProjectList, getSmartsheetConfig, getProjectMilestones, deriveCurrentPhase } from "@/lib/smartsheet-data";
import { getAllQuestions } from "@/lib/question-store";
import { getSuppliersByAssignee, getAllActiveSuppliers } from "@/lib/supplier-store";
import SyncHubSpotButton from "@/components/dashboard/SyncHubSpotButton";
import SendNotificationsButton from "@/components/dashboard/SendNotificationsButton";
import SyncStatusBar from "@/components/dashboard/SyncStatusBar";
import ProjectTable from "@/components/dashboard/ProjectTable";
import ScWelcome from "@/components/dashboard/ScWelcome";
import SeWelcome from "@/components/dashboard/SeWelcome";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await auth();
  const allProjects = getProjectList();
  const dataTimestamp = new Date().toISOString();

  const userEmail = session?.user?.email || "";
  const userRole = session?.user?.role || "SC";
  const userName = session?.user?.name || "there";

  const projects = userRole === "ADMIN"
    ? allProjects
    : userRole === "SE"
    ? allProjects.filter((p) => p.seEmail === userEmail)
    : allProjects.filter((p) => p.scEmail === userEmail || p.pmEmail === userEmail);

  const seSuppliers = userRole === "SE" ? getSuppliersByAssignee(userName) : [];
  const allActiveSuppliers = userRole === "SE" ? getAllActiveSuppliers() : [];

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

  const openQuestionCount = getAllQuestions().filter((q) => q.status === "open").length;

  const totalProjects = projectRows.length;
  const atRiskCount = projectRows.filter((p) => p.status === "AT_RISK" || p.status === "OFF_TRACK").length;
  const goLiveSoonCount = projectRows.filter((p) => p.daysToGoLive !== null && p.daysToGoLive >= 0 && p.daysToGoLive <= 30).length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
      {userRole === "SE" ? (
        <SeWelcome
          userName={userName}
          mySuppliers={seSuppliers}
          allActiveSuppliers={allActiveSuppliers}
          projects={projectRows}
        />
      ) : (
        <ScWelcome
          userName={userName}
          projects={projectRows}
          openQuestionCount={openQuestionCount}
        />
      )}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        <div className="bg-white dark:bg-neutral-800 rounded-card px-4 py-3 border border-esm-border dark:border-neutral-700">
          <p className="text-[10px] font-bold text-esm-grey dark:text-neutral-400 uppercase tracking-wider">Active projects</p>
          <p className="text-2xl font-bold text-esm-black dark:text-neutral-100 mt-1">{totalProjects}</p>
        </div>
        <div className="bg-white dark:bg-neutral-800 rounded-card px-4 py-3 border border-esm-border dark:border-neutral-700">
          <p className="text-[10px] font-bold text-esm-grey dark:text-neutral-400 uppercase tracking-wider">At risk</p>
          <p className={`text-2xl font-bold mt-1 ${atRiskCount > 0 ? "text-red-600" : "text-emerald-600 dark:text-emerald-400"}`}>{atRiskCount}</p>
        </div>
        <div className="bg-white dark:bg-neutral-800 rounded-card px-4 py-3 border border-esm-border dark:border-neutral-700">
          <p className="text-[10px] font-bold text-esm-grey dark:text-neutral-400 uppercase tracking-wider">Go-live within 30d</p>
          <p className={`text-2xl font-bold mt-1 ${goLiveSoonCount > 0 ? "text-amber-600" : "text-esm-black dark:text-neutral-100"}`}>{goLiveSoonCount}</p>
        </div>
        <div className="bg-white dark:bg-neutral-800 rounded-card px-4 py-3 border border-esm-border dark:border-neutral-700">
          <p className="text-[10px] font-bold text-esm-grey dark:text-neutral-400 uppercase tracking-wider">Open questions</p>
          <p className={`text-2xl font-bold mt-1 ${openQuestionCount > 0 ? "text-blue-600" : "text-esm-black dark:text-neutral-100"}`}>{openQuestionCount}</p>
        </div>
      </div>
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard/create"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-card bg-esm-red text-white hover:bg-esm-red-dark transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            New Project
          </Link>
          <SyncHubSpotButton />
          <SendNotificationsButton />
        </div>
        <SyncStatusBar dataTimestamp={dataTimestamp} />
      </div>
      <ProjectTable projects={projectRows} />
    </div>
  );
}
