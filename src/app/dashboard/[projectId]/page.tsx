import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getProjectById,
  getSmartsheetConfig,
  getProjectMilestones,
  getProjectActionItems,
  getProjectActivity,
  getProjectIntegrations,
  getRaidLogItems,
  getProjectMeetings,
  getProjectDocuments,
  deriveCurrentPhase,
} from "@/lib/smartsheet-data";
import { parseLocalDate } from "@/lib/date-utils";
import SyncStatusBar from "@/components/dashboard/SyncStatusBar";
import ProjectTimeline from "@/components/dashboard/ProjectTimeline";
import ActivityFeed from "@/components/dashboard/ActivityFeed";
import RefreshMetricsButton from "@/components/dashboard/RefreshMetricsButton";
import PortalActivityCard from "@/components/dashboard/PortalActivityCard";
import GenerateMeetingsButton from "@/components/dashboard/GenerateMeetingsButton";

function fmtDate(d: string | null | undefined): string {
  if (!d) return "—";
  return parseLocalDate(d).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

const STATUS_BADGE: Record<string, { bg: string; text: string; label: string }> = {
  ON_TRACK: { bg: "bg-emerald-100", text: "text-emerald-800", label: "On Track" },
  AT_RISK: { bg: "bg-amber-100", text: "text-amber-800", label: "At Risk" },
  OFF_TRACK: { bg: "bg-red-100", text: "text-red-800", label: "Off Track" },
};

export default async function ProjectDetailPage({ params }: { params: { projectId: string } }) {
  const project = getProjectById(params.projectId);
  if (!project) notFound();

  const config = getSmartsheetConfig(params.projectId);

  const milestones = config.projectPlanSheetId
    ? await getProjectMilestones(config.projectPlanSheetId)
    : [];

  const actionItems = config.actionItemSheetId
    ? await getProjectActionItems(config.actionItemSheetId)
    : [];

  const [activity, integrations, raidItems, meetings, documents] = await Promise.all([
    getProjectActivity(config),
    config.integrationTrackerSheetId ? getProjectIntegrations(config.integrationTrackerSheetId) : Promise.resolve([]),
    config.raidLogSheetId ? getRaidLogItems(config.raidLogSheetId) : Promise.resolve([]),
    config.meetingTrackerSheetId ? getProjectMeetings(config.meetingTrackerSheetId) : Promise.resolve([]),
    config.documentSheetId ? getProjectDocuments(config.documentSheetId) : Promise.resolve([]),
  ]);

  const openItems = actionItems.filter((a) => a.status !== "done");

  const integsDone = integrations.filter((i) => {
    const s = i.status.toLowerCase();
    return s === "complete" || s === "done" || s === "live";
  }).length;

  const raidByType = { Risk: 0, Action: 0, Issue: 0, Decision: 0 };
  const raidOpen = raidItems.filter((r) => r.status !== "Complete");
  for (const r of raidItems) {
    if (r.type in raidByType) raidByType[r.type as keyof typeof raidByType]++;
  }

  const meetingsHeld = meetings.filter((m) => m.status === "Complete").length;
  const meetingsMissingRecap = meetings.filter((m) => m.status === "Complete" && !m.recapSent);

  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const daysToGoLive = project.goLiveDate
    ? Math.ceil((parseLocalDate(project.goLiveDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    : null;

  const badge = STATUS_BADGE[project.status] || STATUS_BADGE.ON_TRACK;
  const dataTimestamp = new Date().toISOString();
  const ssUrl = (id?: string) => id ? `https://app.smartsheet.com/sheets/${id}` : undefined;

  return (
    <main className="min-h-screen bg-esm-grey-light">
      <div className="bg-white border-b border-[#E2E0E1]">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center gap-2 text-sm text-esm-grey mb-2">
            <Link href="/dashboard" className="hover:text-esm-black">Dashboard</Link>
            <span>/</span>
            <span className="text-esm-black">{project.customerName}</span>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold text-esm-black">{project.customerName}</h1>
              <p className="text-sm text-esm-grey">{project.projectName} — {project.scName}</p>
            </div>
            <div className="flex items-center gap-4">
              <SyncStatusBar dataTimestamp={dataTimestamp} />
              <span className={`inline-block px-3 py-1 text-xs font-medium rounded-full ${badge.bg} ${badge.text}`}>
                {badge.label}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6 grid grid-cols-3 gap-6">
        {/* Project info */}
        <div className="col-span-2 space-y-6">
          <div className="bg-white rounded-sm border border-[#E2E0E1] p-5">
            <h2 className="text-sm font-bold text-esm-grey uppercase tracking-wider mb-4">Project Details</h2>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <InfoRow label="Go-Live" value={fmtDate(project.goLiveDate)} />
              <InfoRow label="Phase" value={deriveCurrentPhase(milestones, project.currentPhase)} />
              <InfoRow label="Products" value={project.products.join(", ") || "—"} />
              <InfoRow label="SC" value={`${project.scName} (${project.scEmail})`} />
              <InfoRow label="PM" value={project.pmName || "—"} />
            </div>
          </div>

          {/* Timeline / Gantt */}
          <ProjectTimeline
            milestones={milestones.map((m) => ({
              id: m.id,
              name: m.name,
              startDate: m.startDate ?? null,
              endDate: m.endDate ?? null,
              status: m.status,
              percentComplete: m.percentComplete ?? null,
            }))}
            projectStart={project.startDate}
            projectEnd={project.goLiveDate}
          />

          {/* Milestone list */}
          <div className="bg-white rounded-sm border border-[#E2E0E1] p-5">
            <h2 className="text-sm font-bold text-esm-grey uppercase tracking-wider mb-4">Milestones</h2>
            <div className="space-y-1">
              {milestones.map((m) => (
                <div key={m.id} className="flex items-center justify-between text-xs py-1.5 border-b border-gray-100 last:border-0">
                  <span className="text-esm-black">{m.name}</span>
                  <div className="flex items-center gap-3">
                    {m.startDate && m.endDate && (
                      <span className="text-slate-400">{fmtDate(m.startDate)} → {fmtDate(m.endDate)}</span>
                    )}
                    {!m.startDate && <span className="text-esm-grey">{fmtDate(m.date)}</span>}
                    {m.percentComplete != null && (
                      <span className="text-xs text-slate-400">{Math.round((m.percentComplete ?? 0) * 100)}%</span>
                    )}
                    <span className={`font-medium ${m.status === "complete" ? "text-emerald-600" : m.status === "in-progress" ? "text-blue-600" : "text-esm-grey"}`}>
                      {m.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <div className="bg-white rounded-sm border border-[#E2E0E1] p-5">
            <h2 className="text-sm font-bold text-esm-grey uppercase tracking-wider mb-3">Quick Stats</h2>
            <div className="space-y-2.5 text-sm">
              {daysToGoLive !== null && (
                <div className="flex justify-between">
                  <span className="text-esm-grey">Days to Go-Live</span>
                  <span className={`font-medium ${daysToGoLive < 0 ? "text-red-600" : daysToGoLive <= 30 ? "text-red-600" : daysToGoLive <= 60 ? "text-amber-600" : "text-emerald-600"}`}>
                    {daysToGoLive < 0 ? "Overdue" : `${daysToGoLive}d`}
                  </span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-esm-grey">Milestones</span>
                <span className="font-medium text-esm-black">
                  {milestones.filter((m) => m.status === "complete").length}/{milestones.length}
                </span>
              </div>
              {integrations.length > 0 && (
                <div className="flex justify-between">
                  <span className="text-esm-grey">Integrations</span>
                  <span className="font-medium text-esm-black">{integsDone}/{integrations.length}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-esm-grey">Open Items</span>
                <span className={`font-medium ${openItems.length > 10 ? "text-red-600" : "text-esm-black"}`}>{openItems.length}</span>
              </div>
              {raidItems.length > 0 && (
                <div className="flex justify-between">
                  <span className="text-esm-grey">RAID Open</span>
                  <span className={`font-medium ${raidOpen.length > 5 ? "text-amber-600" : "text-esm-black"}`}>{raidOpen.length}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-esm-grey">Meetings Held</span>
                <span className="font-medium text-esm-black">{meetingsHeld}/{meetings.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-esm-grey">Documents</span>
                <span className="font-medium text-esm-black">{documents.length}</span>
              </div>
            </div>
          </div>

          {/* Meeting recap alerts */}
          {meetingsMissingRecap.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-sm p-4">
              <h3 className="text-xs font-bold text-amber-800 uppercase tracking-wider mb-2">Recaps Needed</h3>
              <ul className="space-y-1.5">
                {meetingsMissingRecap.map((m) => (
                  <li key={m.id} className="text-xs text-amber-700 flex items-start gap-1.5">
                    <span className="text-amber-500 mt-0.5">!</span>
                    <span>
                      {m.week}
                      {m.meetingDate && (
                        <span className="text-amber-600 ml-1">
                          ({parseLocalDate(m.meetingDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })})
                        </span>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* RAID breakdown */}
          {raidItems.length > 0 && (
            <div className="bg-white rounded-sm border border-[#E2E0E1] p-5">
              <div className="flex justify-between items-center mb-3">
                <h2 className="text-sm font-bold text-esm-grey uppercase tracking-wider">RAID Log</h2>
                {config.raidLogSheetId && (
                  <a
                    href={ssUrl(config.raidLogSheetId)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-esm-blue hover:underline"
                  >
                    Open in Smartsheet
                  </a>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2">
                {(["Risk", "Action", "Issue", "Decision"] as const).map((type) => {
                  const count = raidByType[type];
                  if (count === 0) return null;
                  const openCount = raidItems.filter((r) => r.type === type && r.status !== "Complete").length;
                  return (
                    <div key={type} className="bg-gray-50 rounded px-3 py-2">
                      <div className="text-[10px] font-bold text-esm-grey uppercase tracking-wider">{type}s</div>
                      <div className="text-lg font-bold text-esm-black">{count}</div>
                      {openCount > 0 && <div className="text-[10px] text-amber-600">{openCount} open</div>}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Link href={`/dashboard/${project.id}/documents`} className="block w-full text-center bg-esm-red text-white text-sm font-medium py-2 rounded hover:opacity-90 transition-opacity">
              Documents
            </Link>
            <Link href={`/dashboard/${project.id}/config`} className="block w-full text-center bg-esm-blue text-white text-sm font-medium py-2 rounded hover:opacity-90 transition-opacity">
              Configure Hub
            </Link>
            {project.sharepointFolderUrl && (
              <a href={project.sharepointFolderUrl} target="_blank" rel="noopener noreferrer" className="block w-full text-center bg-[#0078D4] text-white text-sm font-medium py-2 rounded hover:opacity-90 transition-opacity">
                SharePoint Folder
              </a>
            )}
            <RefreshMetricsButton projectId={project.id} />
            <GenerateMeetingsButton projectId={project.id} />
          </div>

          <PortalActivityCard projectId={project.id} />

          <ActivityFeed events={activity} />
        </div>
      </div>
    </main>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-esm-grey">{label}:</span>{" "}
      <span className="text-esm-black font-medium">{value}</span>
    </div>
  );
}
