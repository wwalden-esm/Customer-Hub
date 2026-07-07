import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCustomerSession } from "@/lib/magic-link";
import { getProjectById, getSmartsheetConfig } from "@/lib/smartsheet-data";
import { getHubDashboardData } from "@/lib/hub-data";

export async function generateMetadata(): Promise<Metadata> {
  const session = await getCustomerSession();
  if (!session) return {};
  const project = getProjectById(session.projectId);
  return { title: project ? `${project.customerName} — Dashboard` : "Dashboard" };
}
import HealthBanner from "@/components/hub/HealthBanner";
import MetricCard from "@/components/hub/MetricCard";
import MilestoneLine from "@/components/hub/MilestoneLine";
import OpenItems from "@/components/hub/OpenItems";
import ProjectTimeline from "@/components/dashboard/ProjectTimeline";
import ActivityFeed from "@/components/dashboard/ActivityFeed";
import QuickLinks from "@/components/hub/QuickLinks";

export default async function HubDashboard() {
  const session = await getCustomerSession();
  if (!session) redirect("/hub/login");

  const data = await getHubDashboardData(session.projectId);
  if (!data) redirect("/hub/login");

  const { metrics, daysToGoLive, intakePercent, project, upcomingMeetings } = data;
  const milestoneMetric = metrics.find((m) => m.metricType === "milestone");
  const integMetric = metrics.find((m) => m.metricType === "integration");
  const meetingsMetric = metrics.find((m) => m.metricType === "meetings");
  const raidMetric = metrics.find((m) => m.metricType === "raid");
  const docsMetric = metrics.find((m) => m.metricType === "documents");

  const ssConfig = getSmartsheetConfig(session.projectId);
  const ssUrl = (id?: string) => id ? `https://app.smartsheet.com/sheets/${id}` : undefined;

  return (
    <>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-esm-black">{project.projectName}</h1>
        <p className="text-sm text-esm-grey mt-1">
          {project.products.join(" + ")} — {project.scName}
        </p>
      </div>

      <HealthBanner data={data} />

      {/* Metric cards */}
      <section aria-label="Key metrics" className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 mb-5">
        <MetricCard
          label="Days to Go-Live"
          value={daysToGoLive !== null ? String(daysToGoLive) : "TBD"}
          sub={project.goLiveDate ? new Date(project.goLiveDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "Not set"}
          color={daysToGoLive !== null && daysToGoLive <= 30 ? "#F4333F" : undefined}
        />
        {milestoneMetric && (
          <MetricCard
            label="Milestones"
            value={`${milestoneMetric.percent}%`}
            sub={`${milestoneMetric.current} of ${milestoneMetric.total} complete`}
            percent={milestoneMetric.percent}
            href={ssUrl(ssConfig.projectPlanSheetId)}
          />
        )}
        {integMetric && (
          <MetricCard
            label="Integrations"
            value={`${integMetric.percent}%`}
            sub={`${integMetric.current} of ${integMetric.total} complete`}
            percent={integMetric.percent}
            href={ssUrl(ssConfig.integrationTrackerSheetId)}
          />
        )}
        {meetingsMetric && (
          <MetricCard
            label="Meetings"
            value={`${meetingsMetric.current}`}
            sub={`${meetingsMetric.current} of ${meetingsMetric.total} held`}
            href={ssUrl(ssConfig.meetingTrackerSheetId)}
          />
        )}
        {raidMetric && raidMetric.total > 0 && (
          <MetricCard
            label="RAID Items"
            value={`${raidMetric.total - raidMetric.current}`}
            sub={`${raidMetric.total - raidMetric.current} open of ${raidMetric.total}`}
            color={raidMetric.total - raidMetric.current > 5 ? "#F4333F" : undefined}
            href={ssUrl(ssConfig.raidLogSheetId)}
          />
        )}
        <MetricCard
          label="Current Phase"
          value={project.currentPhase}
          sub={`Intake ${intakePercent}% complete`}
        />
      </section>

      <MilestoneLine milestones={data.milestones} />

      {/* Timeline / Gantt */}
      <div className="mb-5">
        <ProjectTimeline
          milestones={data.milestones.map((m) => ({
            id: m.id,
            name: m.name,
            startDate: m.startDate,
            endDate: m.endDate,
            status: m.status,
            percentComplete: m.percentComplete,
          }))}
          projectEnd={project.goLiveDate ?? undefined}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2">
          <OpenItems items={data.actionItems} />
        </div>
        <div className="space-y-5">
          <QuickLinks links={data.links} />
          {/* Contact SC */}
          <section className="bg-white border border-[#E2E0E1] rounded-sm p-5" aria-labelledby="sc-heading">
            <h2 id="sc-heading" className="text-[10px] font-extrabold text-esm-grey tracking-[0.09em] uppercase mb-3">
              Your Solutions Consultant
            </h2>
            <p className="text-sm font-medium text-esm-black">{project.scName}</p>
            {project.scEmail && (
              <a
                href={`mailto:${project.scEmail}`}
                aria-label={`Email ${project.scName}`}
                className="inline-flex items-center gap-2 mt-3 px-4 py-2 text-sm font-medium rounded transition-colors"
                style={{ backgroundColor: "var(--hub-accent)", color: "#fff" }}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                Contact SC
              </a>
            )}
          </section>
          {/* Upcoming Meetings */}
          {upcomingMeetings.length > 0 && (
            <section className="bg-white border border-[#E2E0E1] rounded-sm p-5" aria-labelledby="upcoming-meetings-heading">
              <h2 id="upcoming-meetings-heading" className="text-[10px] font-extrabold text-esm-grey tracking-[0.09em] uppercase mb-3">
                Upcoming Meetings
              </h2>
              <ul className="space-y-3">
                {upcomingMeetings.map((m) => (
                  <li key={m.id} className="border-l-2 pl-3" style={{ borderColor: "var(--hub-accent, #F4333F)" }}>
                    <p className="text-sm font-medium text-esm-black">{m.week}</p>
                    {m.milestone && (
                      <p className="text-xs text-esm-grey mt-0.5">{m.milestone}</p>
                    )}
                    {m.meetingDate && (
                      <p className="text-xs text-slate-500 mt-0.5">
                        {new Date(m.meetingDate).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
              <a href="/hub/meetings" aria-label="View all meetings" className="block text-xs font-medium mt-3 hover:underline" style={{ color: "var(--hub-accent, #F4333F)" }}>
                View all meetings →
              </a>
            </section>
          )}
          <ActivityFeed events={data.activity} />
        </div>
      </div>
    </>
  );
}
