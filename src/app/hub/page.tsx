import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCustomerSession } from "@/lib/magic-link";
import { getProjectById } from "@/lib/smartsheet-data";
import { getHubDashboardData } from "@/lib/hub-data";

export async function generateMetadata(): Promise<Metadata> {
  const session = await getCustomerSession();
  if (!session) return {};
  const project = getProjectById(session.projectId);
  return { title: project ? `${project.customerName} — Dashboard` : "Dashboard" };
}
import { parseLocalDate } from "@/lib/date-utils";
import HealthBanner from "@/components/hub/HealthBanner";
import MetricCard from "@/components/hub/MetricCard";
import MilestoneLine from "@/components/hub/MilestoneLine";
import OpenItems from "@/components/hub/OpenItems";
import CustomerActionItems from "@/components/hub/CustomerActionItems";
import GoLiveReadiness from "@/components/hub/GoLiveReadiness";
import DecisionLog from "@/components/hub/DecisionLog";
import UpcomingDeadlines from "@/components/hub/UpcomingDeadlines";
import HealthTrend from "@/components/hub/HealthTrend";
import TrainingProgress from "@/components/hub/TrainingProgress";
import DocShortcuts from "@/components/hub/DocShortcuts";
import ProjectTimeline from "@/components/dashboard/ProjectTimeline";
import ActivityFeed from "@/components/dashboard/ActivityFeed";
import QuickLinks from "@/components/hub/QuickLinks";
import RefreshButton from "@/components/hub/RefreshButton";

export default async function HubDashboard() {
  const session = await getCustomerSession();
  if (!session) redirect("/hub/login");

  const data = await getHubDashboardData(session.projectId, session.name ?? undefined);
  if (!data) redirect("/hub/login");

  const { metrics, daysToGoLive, daysElapsed, totalDays, intakePercent, project, upcomingMeetings } = data;
  const milestoneMetric = metrics.find((m) => m.metricType === "milestone");
  const integMetric = metrics.find((m) => m.metricType === "integration");
  const meetingsMetric = metrics.find((m) => m.metricType === "meetings");
  const raidMetric = metrics.find((m) => m.metricType === "raid");
  const docsMetric = metrics.find((m) => m.metricType === "documents");
  const timelinePercent = totalDays && totalDays > 0 ? Math.min(100, Math.round((daysElapsed! / totalDays) * 100)) : null;

  const pl = data.sheetPermalinks;
  const hasDeadlines = data.deadlines.length > 0;
  const hasMeetings = upcomingMeetings.length > 0;

  return (
    <>
      {/* ── Header ── */}
      <div className="mb-4 flex items-start justify-between">
        <div>
          {data.contactName && data.contactName !== "Customer" && (
            <p className="text-sm text-esm-grey mb-0.5">Welcome back, {data.contactName.split(" ")[0]}</p>
          )}
          <h1 className="text-xl font-bold text-esm-black">{project.projectName}</h1>
          <p className="text-sm text-esm-grey mt-1">
            {project.products.join(" + ")}
          </p>
          {project.startDate && project.goLiveDate && (
            <p className="text-xs text-esm-muted mt-1">
              {parseLocalDate(project.startDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
              {" → "}
              {parseLocalDate(project.goLiveDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
            </p>
          )}
        </div>
        <RefreshButton />
      </div>

      {/* ── Team + Timeline row ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
        {/* Team contact card */}
        {data.team.length > 0 && (
          <div className="bg-white border border-esm-border rounded-card px-5 py-3 flex flex-col gap-3">
            {data.team.map((member) => (
              <div key={member.role} className="flex items-center gap-2.5">
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0"
                  style={{ backgroundColor: "var(--hub-accent, #F4333F)" }}
                  aria-hidden="true"
                >
                  {member.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                </div>
                <div className="text-sm">
                  <span className="font-medium text-esm-black">{member.name}</span>
                  <span className="text-esm-grey">{" · "}{member.role}</span>
                </div>
                {member.email && (
                  <a
                    href={`mailto:${member.email}?subject=${encodeURIComponent(`${project.projectName} — Question`)}`}
                    className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-card border border-esm-border hover:bg-slate-50 transition-colors text-esm-grey"
                    aria-label={`Email ${member.name}`}
                  >
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    Email
                  </a>
                )}
              </div>
            ))}
            {data.team[0].email && (
              <a
                href={`mailto:${data.team.map((t) => t.email).filter(Boolean).join(",")}?subject=${encodeURIComponent(`${project.projectName} — Meeting Request`)}&body=${encodeURIComponent(`Hi ${data.team[0].name.split(" ")[0]},\n\nI hope this message finds you well. I'd like to request a meeting to discuss our ${project.projectName} implementation. Please let me know your availability.\n\nThank you,\n${data.contactName || ""}`.trim())}`}
                className="inline-flex items-center justify-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-card border hover:bg-slate-50 transition-colors"
                style={{ color: "var(--hub-accent, #F4333F)", borderColor: "var(--hub-accent, #F4333F)" }}
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Request a meeting
              </a>
            )}
          </div>
        )}

        {/* Timeline bar */}
        {timelinePercent !== null && totalDays !== null && daysElapsed !== null && (
          <section className="bg-white border border-esm-border rounded-card p-4 flex flex-col justify-center" aria-label="Implementation timeline progress">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-extrabold text-esm-grey tracking-[0.09em] uppercase">
                Implementation Timeline
              </span>
              <span className="text-xs text-esm-grey">
                Day {daysElapsed} of {totalDays}
              </span>
            </div>
            <div className="w-full h-2 bg-[#E2E0E1] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${timelinePercent}%`,
                  backgroundColor: timelinePercent > 90 ? "#F4333F" : "var(--hub-accent, #F4333F)",
                }}
              />
            </div>
            <p className="text-[11px] text-esm-muted mt-1.5">{timelinePercent}% of timeline elapsed</p>
          </section>
        )}
      </div>

      {/* ── Health + Metrics ── */}
      <HealthBanner data={data} />

      <section aria-label="Key metrics" className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 mb-5">
        <MetricCard
          label="Days to Go-Live"
          value={daysToGoLive !== null ? String(daysToGoLive) : "TBD"}
          sub={project.goLiveDate ? parseLocalDate(project.goLiveDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "Not set"}
          color={daysToGoLive !== null && daysToGoLive <= 30 ? "#F4333F" : undefined}
        />
        {milestoneMetric && (
          <MetricCard
            label="Milestones"
            value={`${milestoneMetric.percent}%`}
            sub={`${milestoneMetric.current} of ${milestoneMetric.total} complete`}
            percent={milestoneMetric.percent}
            href={pl.projectPlanSheetId}
          />
        )}
        {integMetric && (
          <MetricCard
            label="Integrations"
            value={`${integMetric.percent}%`}
            sub={`${integMetric.current} of ${integMetric.total} complete`}
            percent={integMetric.percent}
            href={pl.integrationTrackerSheetId}
          />
        )}
        {meetingsMetric && (
          <MetricCard
            label="Meetings"
            value={`${meetingsMetric.current}`}
            sub={`${meetingsMetric.current} of ${meetingsMetric.total} held`}
            href={pl.meetingTrackerSheetId}
          />
        )}
        {raidMetric && raidMetric.total > 0 && (
          <MetricCard
            label="RAID Items"
            value={`${raidMetric.total - raidMetric.current}`}
            sub={`${raidMetric.total - raidMetric.current} open of ${raidMetric.total}`}
            color={raidMetric.total - raidMetric.current > 5 ? "#F4333F" : undefined}
            href={pl.raidLogSheetId}
          />
        )}
        {docsMetric && docsMetric.total > 0 && (
          <MetricCard
            label="Documents"
            value={`${docsMetric.total}`}
            sub={`${docsMetric.total} uploaded`}
            href="/hub/documents"
          />
        )}
        {intakePercent > 0 && (
          <MetricCard
            label="Intake"
            value={`${intakePercent}%`}
            sub="Form completion"
            percent={intakePercent}
            href="/hub/intake"
          />
        )}
        <MetricCard
          label="Current Phase"
          value={project.currentPhase}
          sub={milestoneMetric ? `${milestoneMetric.current} of ${milestoneMetric.total} milestones done` : undefined}
        />
      </section>

      {/* ══════════════════════════════════════════════
          ZONE 1 — What needs your attention now
          ══════════════════════════════════════════════ */}

      <CustomerActionItems items={data.customerActionItems} contactName={data.contactName} />
      {data.customerActionItems.length > 0 && <div className="mb-5" />}

      {(hasDeadlines || hasMeetings) && (
        <div className={`grid grid-cols-1 ${hasDeadlines && hasMeetings ? "lg:grid-cols-2" : ""} gap-5 mb-5`}>
          {hasDeadlines && <UpcomingDeadlines deadlines={data.deadlines} />}
          {hasMeetings && (
            <section className="bg-white border border-esm-border rounded-card p-5" aria-labelledby="upcoming-meetings-heading">
              <h2 id="upcoming-meetings-heading" className="text-[10px] font-extrabold text-esm-grey tracking-[0.09em] uppercase mb-3">
                Upcoming Meetings
              </h2>
              <ul className="space-y-4">
                {upcomingMeetings.map((m) => (
                  <li key={m.id} className="border-l-2 pl-3" style={{ borderColor: "var(--hub-accent, #F4333F)" }}>
                    <p className="text-sm font-medium text-esm-black">{m.week}</p>
                    {m.milestone && (
                      <p className="text-xs text-esm-grey mt-0.5">{m.milestone}</p>
                    )}
                    {m.meetingDate && (
                      <p className="text-xs text-slate-500 mt-0.5">
                        {parseLocalDate(m.meetingDate).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                      </p>
                    )}
                    {m.agendaSummary && (
                      <p className="text-xs text-esm-grey mt-1 leading-relaxed line-clamp-2">{m.agendaSummary}</p>
                    )}
                    {m.customerDeliverables && (
                      <div className="mt-1.5 px-2 py-1 bg-amber-50 border border-amber-200 rounded-card">
                        <p className="text-[10px] font-bold text-amber-700 uppercase tracking-wider">Due from you</p>
                        <p className="text-xs text-amber-800 mt-0.5 leading-relaxed">{m.customerDeliverables}</p>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
              <a href="/hub/meetings" aria-label="View all meetings" className="block text-xs font-medium mt-3 hover:underline" style={{ color: "var(--hub-accent, #F4333F)" }}>
                View all meetings →
              </a>
            </section>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════
          ZONE 2 — Project progress
          ══════════════════════════════════════════════ */}

      <MilestoneLine milestones={data.milestones.filter((m) => m.isMilestone || m.level === 1)} />

      <div className="mb-5">
        <ProjectTimeline
          milestones={data.milestones
            .filter((m) => (m.level === 1 || m.level === 2) && (m.startDate || m.endDate))
            .map((m) => ({
              id: m.id,
              name: m.phase ? `${m.name}` : m.name,
              startDate: m.startDate,
              endDate: m.endDate,
              status: m.status,
              percentComplete: m.percentComplete,
            }))}
          projectEnd={project.goLiveDate ?? undefined}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-5">
        <div className="lg:col-span-2 space-y-5">
          <OpenItems items={data.actionItems.slice(0, 5)} />
          {data.actionItems.length > 5 && (
            <a
              href="/hub/raid-log"
              className="block text-center text-xs font-medium -mt-3 py-2 border border-esm-border rounded-card hover:bg-slate-50 transition-colors"
              style={{ color: "var(--hub-accent, #F4333F)" }}
            >
              View all {data.actionItems.length} action items
            </a>
          )}

          {data.integrations.length > 0 && (
            <section className="bg-white border border-esm-border rounded-card overflow-hidden" aria-labelledby="integrations-heading">
              <div className="flex justify-between items-center px-5 py-3.5 border-b border-esm-border">
                <h2 id="integrations-heading" className="text-[10px] font-extrabold text-esm-grey tracking-[0.09em] uppercase">
                  Integration Status
                </h2>
                <div className="text-[11px] font-bold px-2.5 py-0.5 rounded-card border bg-gray-50 text-esm-grey border-esm-border">
                  {data.integrations.filter((i) => { const s = i.status.toLowerCase(); return s === "complete" || s === "done" || s === "live"; }).length} of {data.integrations.length} complete
                </div>
              </div>
              <div className="divide-y divide-gray-100">
                {data.integrations.map((integ) => {
                  const s = integ.status.toLowerCase();
                  const isDone = s === "complete" || s === "done" || s === "live";
                  const isActive = s.includes("progress") || s === "in progress";
                  const integSheetUrl = pl.integrationTrackerSheetId;
                  const Row = integSheetUrl ? "a" : "div";
                  return (
                    <Row
                      key={integ.id}
                      {...(integSheetUrl ? { href: integSheetUrl, target: "_blank", rel: "noopener noreferrer" } : {})}
                      className={`px-5 py-2.5 flex items-center justify-between${integSheetUrl ? " hover:bg-gray-50 transition-colors no-underline" : ""}`}
                    >
                      <span className="text-sm text-esm-black flex items-center gap-1.5">
                        {integ.name}
                        {integSheetUrl && (
                          <svg className="w-3 h-3 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                        )}
                      </span>
                      <span className={`text-[10px] font-bold tracking-wide uppercase px-2 py-0.5 rounded-card border ${
                        isDone ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : isActive ? "bg-blue-50 text-blue-700 border-blue-200"
                        : "bg-gray-50 text-esm-grey border-esm-border"
                      }`}>
                        {integ.status}
                      </span>
                    </Row>
                  );
                })}
              </div>
            </section>
          )}
        </div>
        <div className="space-y-5">
          <GoLiveReadiness items={data.goLiveReadiness} daysToGoLive={daysToGoLive} />
          {data.trainingProgress && (
            <TrainingProgress completed={data.trainingProgress.completed} total={data.trainingProgress.total} />
          )}
          <DecisionLog decisions={data.decisions} raidLogUrl={pl.raidLogSheetId} />
        </div>
      </div>

      {/* ══════════════════════════════════════════════
          ZONE 3 — Resources & team
          ══════════════════════════════════════════════ */}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
        <QuickLinks links={data.links} />
        <DocShortcuts projectId={project.id} documentTypes={data.documentTypes} />
      </div>

      {/* ══════════════════════════════════════════════
          ZONE 4 — History & trends (lower priority)
          ══════════════════════════════════════════════ */}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <ActivityFeed events={data.activity} />
        <HealthTrend history={data.healthHistory} currentStatus={project.status} />
      </div>
    </>
  );
}
