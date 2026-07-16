import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCustomerSession } from "@/lib/magic-link";
import { getHubDashboardData } from "@/lib/hub-data";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import type { BadgeVariant } from "@/components/ui/Badge";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { parseLocalDate } from "@/lib/date-utils";
import PrintButton from "@/components/hub/PrintButton";

export async function generateMetadata(): Promise<Metadata> {
  return { title: "Status Report" };
}

/* ---------- helpers ---------- */

function formatDate(dateStr: string): string {
  const d = parseLocalDate(dateStr);
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function statusBadge(status: "ON_TRACK" | "AT_RISK" | "OFF_TRACK"): {
  label: string;
  variant: BadgeVariant;
} {
  switch (status) {
    case "ON_TRACK":
      return { label: "On Track", variant: "success" };
    case "AT_RISK":
      return { label: "At Risk", variant: "warning" };
    case "OFF_TRACK":
      return { label: "Off Track", variant: "danger" };
  }
}

function priorityOrder(p: string): number {
  switch (p.toLowerCase()) {
    case "high":
      return 0;
    case "medium":
      return 1;
    case "low":
      return 2;
    default:
      return 3;
  }
}

function priorityBadgeVariant(p: string): BadgeVariant {
  switch (p.toLowerCase()) {
    case "high":
      return "danger";
    case "medium":
      return "warning";
    case "low":
      return "info";
    default:
      return "neutral";
  }
}

/* ---------- page ---------- */

export default async function StatusReportPage() {
  const session = await getCustomerSession();
  if (!session) redirect("/hub/login");

  const data = await getHubDashboardData(session.projectId, session.name ?? undefined);
  if (!data) {
    return (
      <div className="text-center py-20 text-esm-muted">
        Unable to load project data. Please try again later.
      </div>
    );
  }

  const now = new Date();
  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const thirtyDaysFromNow = new Date(now);
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

  /* Recent activity (last 7 days) */
  const recentActivity = data.activity.filter((event) => {
    const eventDate = parseLocalDate(event.timestamp);
    return eventDate >= sevenDaysAgo;
  });

  /* Upcoming milestones (not complete, within 30 days) */
  const upcomingMilestones = data.milestones.filter((m) => {
    if (m.status === "complete") return false;
    if (!m.endDate) return false;
    const endDate = parseLocalDate(m.endDate);
    return endDate >= now && endDate <= thirtyDaysFromNow;
  });

  /* Open action items grouped by priority */
  const openItems = data.actionItems
    .filter((i) => i.status !== "done")
    .sort((a, b) => priorityOrder(a.priority) - priorityOrder(b.priority));

  const groupedByPriority = openItems.reduce<Record<string, typeof openItems>>(
    (acc, item) => {
      const key = item.priority || "Unspecified";
      if (!acc[key]) acc[key] = [];
      acc[key].push(item);
      return acc;
    },
    {},
  );

  /* Metrics */
  const milestoneMetric = data.metrics.find(
    (m) => m.metricType === "milestones" || m.metricType === "milestone",
  );
  const completeMilestones = milestoneMetric?.current ?? data.milestones.filter((m) => m.status === "complete").length;
  const totalMilestones = milestoneMetric?.total ?? data.milestones.length;
  const milestonePercent = milestoneMetric?.percent ?? (totalMilestones > 0 ? Math.round((completeMilestones / totalMilestones) * 100) : 0);

  const openActionCount = openItems.length;

  const integrationsDone = data.integrations.filter(
    (i) => i.status === "complete" || i.status === "done",
  ).length;
  const integrationsTotal = data.integrations.length;

  const { project } = data;
  const healthBadge = statusBadge(project.status);
  const reportDate = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <>
      {/* Print-optimized styles */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @media print {
              nav, header, [data-hub-nav], [data-hub-header], .print\\:hidden {
                display: none !important;
              }
              body, html {
                background: white !important;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
              }
              .shadow-sm, .shadow-md, .shadow-lg, .shadow-xl {
                box-shadow: none !important;
              }
              .print-card {
                break-inside: avoid;
                page-break-inside: avoid;
              }
              @page {
                margin: 0.75in;
              }
            }
          `,
        }}
      />

      <div className="max-w-4xl mx-auto print:max-w-none">
        {/* Top bar with print button */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-semibold text-esm-black">
              Status Report
            </h1>
            <p className="text-sm text-esm-muted mt-1">{reportDate}</p>
          </div>
          <PrintButton />
        </div>

        {/* Report header */}
        <Card className="mb-6 print-card print:shadow-none print:bg-white">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h2 className="text-xl font-semibold text-esm-black">
                {project.projectName}
              </h2>
              <p className="text-sm text-esm-grey mt-1">
                {project.customerName}
              </p>
              <div className="flex flex-wrap gap-x-6 gap-y-1 mt-3 text-sm text-esm-grey">
                <span>
                  <span className="font-medium text-esm-black">Phase:</span>{" "}
                  {project.currentPhase}
                </span>
                {project.goLiveDate && (
                  <span>
                    <span className="font-medium text-esm-black">Go-Live:</span>{" "}
                    {formatDate(project.goLiveDate)}
                  </span>
                )}
                {data.daysToGoLive !== null && (
                  <span>
                    <span className="font-medium text-esm-black">Days to Go-Live:</span>{" "}
                    {data.daysToGoLive}
                  </span>
                )}
                <span>
                  <span className="font-medium text-esm-black">SC:</span>{" "}
                  {project.scName}
                </span>
              </div>
            </div>
            <Badge variant={healthBadge.variant} pill className="text-sm px-3 py-1">
              {healthBadge.label}
            </Badge>
          </div>
        </Card>

        {/* Key metrics row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <Card padding="sm" className="print-card print:shadow-none print:bg-white text-center">
            <SectionLabel className="mb-1">Milestones</SectionLabel>
            <p className="text-2xl font-bold text-esm-black">{milestonePercent}%</p>
            <p className="text-xs text-esm-muted">
              {completeMilestones} of {totalMilestones} complete
            </p>
          </Card>
          <Card padding="sm" className="print-card print:shadow-none print:bg-white text-center">
            <SectionLabel className="mb-1">Open Actions</SectionLabel>
            <p className="text-2xl font-bold text-esm-black">{openActionCount}</p>
            <p className="text-xs text-esm-muted">items pending</p>
          </Card>
          <Card padding="sm" className="print-card print:shadow-none print:bg-white text-center">
            <SectionLabel className="mb-1">Decisions</SectionLabel>
            <p className="text-2xl font-bold text-esm-black">{data.decisions.length}</p>
            <p className="text-xs text-esm-muted">tracked</p>
          </Card>
          <Card padding="sm" className="print-card print:shadow-none print:bg-white text-center">
            <SectionLabel className="mb-1">Integrations</SectionLabel>
            <p className="text-2xl font-bold text-esm-black">
              {integrationsDone}/{integrationsTotal}
            </p>
            <p className="text-xs text-esm-muted">complete</p>
          </Card>
        </div>

        {/* Recent activity */}
        {recentActivity.length > 0 && (
          <Card className="mb-6 print-card print:shadow-none print:bg-white">
            <SectionLabel className="mb-3">Recent Activity (Last 7 Days)</SectionLabel>
            <ul className="space-y-3 mt-2">
              {recentActivity.map((event) => (
                <li
                  key={event.id}
                  className="flex items-start gap-3 text-sm border-b border-esm-border pb-3 last:border-0 last:pb-0"
                >
                  <span className="text-esm-muted whitespace-nowrap min-w-[5rem]">
                    {formatDate(event.timestamp)}
                  </span>
                  <div>
                    <span className="font-medium text-esm-black">
                      {event.title}
                    </span>
                    {event.detail && (
                      <span className="text-esm-grey"> &mdash; {event.detail}</span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        )}

        {/* Upcoming milestones */}
        {upcomingMilestones.length > 0 && (
          <Card className="mb-6 print-card print:shadow-none print:bg-white">
            <SectionLabel className="mb-3">Upcoming Milestones (Next 30 Days)</SectionLabel>
            <div className="overflow-x-auto">
              <table className="w-full text-sm mt-2">
                <thead>
                  <tr className="text-left text-esm-muted border-b border-esm-border">
                    <th className="pb-2 font-medium">Milestone</th>
                    <th className="pb-2 font-medium">Phase</th>
                    <th className="pb-2 font-medium">Due Date</th>
                    <th className="pb-2 font-medium text-right">Progress</th>
                  </tr>
                </thead>
                <tbody>
                  {upcomingMilestones.map((m) => (
                    <tr
                      key={m.id}
                      className="border-b border-esm-border last:border-0"
                    >
                      <td className="py-2 text-esm-black font-medium">
                        {m.name}
                      </td>
                      <td className="py-2 text-esm-grey">{m.phase}</td>
                      <td className="py-2 text-esm-grey">
                        {m.endDate ? formatDate(m.endDate) : "—"}
                      </td>
                      <td className="py-2 text-right">
                        {m.percentComplete != null ? (
                          <Badge
                            variant={
                              m.percentComplete >= 75
                                ? "success"
                                : m.percentComplete >= 40
                                  ? "warning"
                                  : "neutral"
                            }
                          >
                            {Math.round(m.percentComplete)}%
                          </Badge>
                        ) : (
                          <span className="text-esm-muted">--</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {/* Open action items */}
        {openItems.length > 0 && (
          <Card className="mb-6 print-card print:shadow-none print:bg-white">
            <SectionLabel className="mb-3">Open Action Items</SectionLabel>
            {Object.entries(groupedByPriority)
              .sort(([a], [b]) => priorityOrder(a) - priorityOrder(b))
              .map(([priority, items]) => (
                <div key={priority} className="mt-3 first:mt-2">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant={priorityBadgeVariant(priority)} pill>
                      {priority}
                    </Badge>
                    <span className="text-xs text-esm-muted">
                      ({items.length} item{items.length !== 1 ? "s" : ""})
                    </span>
                  </div>
                  <ul className="space-y-2 ml-1">
                    {items.map((item) => (
                      <li
                        key={item.id}
                        className={`flex items-start justify-between gap-4 text-sm pb-2 border-b border-esm-border last:border-0 last:pb-0 ${
                          item.isOverdue ? "text-red-700" : "text-esm-black"
                        }`}
                      >
                        <div className="flex-1 min-w-0">
                          <span className="font-medium">
                            {item.description}
                          </span>
                          {item.isOverdue && (
                            <Badge variant="danger" className="ml-2 text-xs">
                              Overdue
                            </Badge>
                          )}
                          <div className="text-xs text-esm-muted mt-0.5">
                            Owner: {item.owner}
                          </div>
                        </div>
                        <span className="text-xs text-esm-muted whitespace-nowrap">
                          {item.dueDate ? formatDate(item.dueDate) : "No date"}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
          </Card>
        )}

        {/* Decisions */}
        {data.decisions.length > 0 && (
          <Card className="mb-6 print-card print:shadow-none print:bg-white">
            <SectionLabel className="mb-3">Open Questions / Decisions</SectionLabel>
            <div className="overflow-x-auto">
              <table className="w-full text-sm mt-2">
                <thead>
                  <tr className="text-left text-esm-muted border-b border-esm-border">
                    <th className="pb-2 font-medium">Item</th>
                    <th className="pb-2 font-medium">Status</th>
                    <th className="pb-2 font-medium">Date</th>
                    <th className="pb-2 font-medium">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {data.decisions.map((d) => (
                    <tr
                      key={d.id}
                      className="border-b border-esm-border last:border-0 align-top"
                    >
                      <td className="py-2 text-esm-black font-medium pr-3">
                        {d.item}
                      </td>
                      <td className="py-2 pr-3">
                        <Badge
                          variant={
                            d.status.toLowerCase() === "decided"
                              ? "success"
                              : d.status.toLowerCase() === "blocked"
                                ? "danger"
                                : "warning"
                          }
                        >
                          {d.status}
                        </Badge>
                      </td>
                      <td className="py-2 text-esm-muted whitespace-nowrap pr-3">
                        {d.date ? formatDate(d.date) : "—"}
                      </td>
                      <td className="py-2 text-esm-grey">{d.notes || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {/* Footer */}
        <p className="text-xs text-esm-muted text-center mt-8 mb-4">
          Generated on {reportDate} &middot; Data as of{" "}
          {data.dataTimestamp ? formatDate(data.dataTimestamp) : reportDate}
        </p>
      </div>
    </>
  );
}
