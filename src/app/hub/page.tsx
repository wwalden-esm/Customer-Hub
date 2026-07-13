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
import ProjectTimeline from "@/components/dashboard/ProjectTimeline";
import ActivityFeed from "@/components/dashboard/ActivityFeed";
import QuickLinks from "@/components/hub/QuickLinks";
import RefreshButton from "@/components/hub/RefreshButton";
import MeetingPrepChecklist from "@/components/hub/MeetingPrepChecklist";
import CollapsibleSection from "@/components/hub/CollapsibleSection";
import { Badge, Card, SectionLabel } from "@/components/ui";
import type { BadgeVariant } from "@/components/ui";

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
        <div className="flex items-center gap-2">
          <a
            href="/hub/export"
            className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-card border border-esm-border text-esm-grey hover:bg-slate-50 transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            Export Report
          </a>
          <RefreshButton />
        </div>
      </div>

      {/* ── Licensed Products + Team row ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
        {/* Licensed products */}
        <Card className="!px-5 !py-4">
          <SectionLabel className="mb-3">Licensed Products</SectionLabel>
          <div className="flex flex-wrap gap-2">
            {project.products.map((product) => (
              <span
                key={product}
                className="inline-flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-card border-2"
                style={{ borderColor: "var(--hub-accent, #F4333F)", color: "var(--hub-accent, #F4333F)" }}
              >
                <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4" />
                </svg>
                {product}
              </span>
            ))}
          </div>
        </Card>

        {/* Implementation team */}
        {data.team.length > 0 && (
          <Card className="!px-5 !py-4 flex flex-col">
            <SectionLabel className="mb-3">Implementation Team</SectionLabel>
            <div className="flex flex-col gap-2 flex-1">
              {data.team.map((member) => (
                <div key={member.role} className="flex items-center gap-2.5">
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0"
                    style={{ backgroundColor: "var(--hub-accent, #F4333F)" }}
                    aria-hidden="true"
                  >
                    {member.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                  </div>
                  <div className="text-sm min-w-0">
                    <span className="font-medium text-esm-black">{member.name}</span>
                    <span className="text-esm-muted">{" · "}{member.role}</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex gap-2 mt-3 pt-3 border-t border-esm-border">
              <a
                href={`mailto:${data.team.map((t) => t.email).filter(Boolean).join(",")}?subject=${encodeURIComponent(`${project.projectName} — Question`)}`}
                className="flex-1 inline-flex items-center justify-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-card border hover:bg-slate-50 transition-colors"
                style={{ color: "var(--hub-accent, #F4333F)", borderColor: "var(--hub-accent, #F4333F)" }}
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                Email Team
              </a>
              <a
                href={`mailto:${data.team.map((t) => t.email).filter(Boolean).join(",")}?subject=${encodeURIComponent(`${project.projectName} — Meeting Request`)}&body=${encodeURIComponent(`Hi team,\n\nI'd like to request a meeting to discuss our ${project.projectName} implementation. Please let me know your availability.\n\nThank you,\n${data.contactName || ""}`.trim())}`}
                className="flex-1 inline-flex items-center justify-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-card border hover:bg-slate-50 transition-colors"
                style={{ color: "var(--hub-accent, #F4333F)", borderColor: "var(--hub-accent, #F4333F)" }}
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Request a Meeting
              </a>
            </div>
          </Card>
        )}
      </div>

      {/* ── Health + Metrics ── */}
      <CollapsibleSection id="health" title="Project Health" className="mb-5" defaultExpanded>
        <HealthBanner data={data} />

        <section aria-label="Key metrics" className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 mt-4">
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
      </CollapsibleSection>

      {/* ── Project Timeline ── */}
      <CollapsibleSection id="timeline" title="Project Timeline" defaultExpanded subtitle={timelinePercent != null && daysElapsed != null && totalDays != null ? `Day ${daysElapsed} of ${totalDays} · ${timelinePercent}% elapsed` : undefined} className="mb-5">
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
          daysElapsed={daysElapsed}
          totalDays={totalDays}
          timelinePercent={timelinePercent}
          hideTitle
        />
      </CollapsibleSection>

      {/* ══════════════════════════════════════════════
          ZONE 1 — What needs your attention now
          ══════════════════════════════════════════════ */}

      {data.customerActionItems.length > 0 && (
        <CollapsibleSection id="action-items" title="Your Action Items" className="mb-5">
          <CustomerActionItems items={data.customerActionItems} contactName={data.contactName} />
        </CollapsibleSection>
      )}

      {hasDeadlines && (
        <CollapsibleSection id="upcoming-deadlines" title="Upcoming Deadlines" className="mb-5">
          <UpcomingDeadlines deadlines={data.deadlines} hideTitle maxItems={7} />
        </CollapsibleSection>
      )}

      {hasMeetings && (
        <CollapsibleSection id="upcoming-meetings" title="Upcoming Meetings" className="mb-5">
          <Card padding="md">
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
                  <MeetingPrepChecklist meetingId={m.id} deliverables={m.customerDeliverables} />
                )}
              </li>
            ))}
          </ul>
          <a href="/hub/meetings" aria-label="View all meetings" className="block text-xs font-medium mt-3 hover:underline" style={{ color: "var(--hub-accent, #F4333F)" }}>
            View all meetings →
          </a>
          </Card>
        </CollapsibleSection>
      )}

      {/* ══════════════════════════════════════════════
          ZONE 2 — Project progress
          ══════════════════════════════════════════════ */}

      <CollapsibleSection id="milestones" title="Project Milestones" className="mb-5">
        <MilestoneLine milestones={data.milestones.filter((m) => m.isMilestone || m.level === 1)} />
      </CollapsibleSection>

      <CollapsibleSection id="open-actions" title="Open Action Items" subtitle={`${data.actionItems.length} open`} className="mb-5">
        <OpenItems items={data.actionItems.slice(0, 3)} totalCount={data.actionItems.length} hideTitle />
      </CollapsibleSection>

      {data.integrations.length > 0 && (
        <CollapsibleSection id="integration-status" title="Integration Status" subtitle={`${data.integrations.filter((i) => { const s = i.status.toLowerCase(); return s === "complete" || s === "done" || s === "live"; }).length} of ${data.integrations.length} complete`} className="mb-5">
          <Card padding="sm" className="!p-0 overflow-hidden">
          <div className="divide-y divide-gray-100">
            {data.integrations.map((integ) => {
              const s = integ.status.toLowerCase();
              const isDone = s === "complete" || s === "done" || s === "live";
              const isActive = s.includes("progress") || s === "in progress";
              const integSheetUrl = pl.integrationTrackerSheetId;
              const Row = integSheetUrl ? "a" : "div";
              const integBadgeVariant: BadgeVariant = isDone ? "success" : isActive ? "info" : "neutral";
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
                  <Badge variant={integBadgeVariant} className="text-[10px] font-bold tracking-wide uppercase">
                    {integ.status}
                  </Badge>
                </Row>
              );
            })}
          </div>
          </Card>
        </CollapsibleSection>
      )}

      <CollapsibleSection id="go-live-readiness" title="Go-Live Readiness" className="mb-5">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <GoLiveReadiness items={data.goLiveReadiness} daysToGoLive={daysToGoLive} />
          {data.trainingProgress && (
            <TrainingProgress completed={data.trainingProgress.completed} total={data.trainingProgress.total} />
          )}
        </div>
      </CollapsibleSection>

      <CollapsibleSection id="decision-log" title="Decision Log" subtitle={`${data.decisions.length} recorded`} className="mb-5">
        <DecisionLog decisions={data.decisions} raidLogUrl={pl.raidLogSheetId} hideTitle />
      </CollapsibleSection>

      {/* ══════════════════════════════════════════════
          ZONE 3 — Resources & team
          ══════════════════════════════════════════════ */}

      <CollapsibleSection id="resources" title="Resources" className="mb-5">
        <QuickLinks links={data.links} />
      </CollapsibleSection>

      {/* ══════════════════════════════════════════════
          ZONE 4 — History & trends (lower priority)
          ══════════════════════════════════════════════ */}

      <CollapsibleSection id="activity" title={data.healthHistory.length >= 2 ? "Activity & Trends" : "Activity"}>
        <div className={`grid grid-cols-1 ${data.healthHistory.length >= 2 ? "lg:grid-cols-2" : ""} gap-5`}>
          <ActivityFeed events={data.activity.slice(0, 3)} totalCount={data.activity.length} />
          {data.healthHistory.length >= 2 && (
            <HealthTrend history={data.healthHistory.slice(-3)} currentStatus={project.status} />
          )}
        </div>
      </CollapsibleSection>
    </>
  );
}
