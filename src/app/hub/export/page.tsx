import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCustomerSession } from "@/lib/magic-link";
import { getHubDashboardData } from "@/lib/hub-data";
import { getProjectById } from "@/lib/smartsheet-data";
import { parseLocalDate } from "@/lib/date-utils";
import { Card, Badge, SectionLabel } from "@/components/ui";
import type { BadgeVariant } from "@/components/ui";
import PrintButton from "@/components/hub/PrintButton";

export async function generateMetadata(): Promise<Metadata> {
  return { title: "Status Report" };
}

export default async function ExportPage() {
  const session = await getCustomerSession();
  if (!session) redirect("/hub/login");

  const data = await getHubDashboardData(session.projectId, session.name ?? undefined);
  if (!data) redirect("/hub/login");

  const project = getProjectById(session.projectId);
  if (!project) redirect("/hub/login");

  const { metrics, daysToGoLive, milestones } = data;
  const milestoneMetric = metrics.find((m) => m.metricType === "milestone");
  const integMetric = metrics.find((m) => m.metricType === "integration");

  const statusVariant: Record<string, BadgeVariant> = {
    ON_TRACK: "success",
    AT_RISK: "warning",
    OFF_TRACK: "danger",
  };

  const reportDate = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6 print:hidden">
        <div>
          <h1 className="text-2xl font-semibold text-esm-black">Status Report</h1>
          <p className="text-sm text-esm-grey mt-1">Print-friendly project summary for stakeholder sharing</p>
        </div>
        <PrintButton />
      </div>

      {/* Print-only header */}
      <div className="hidden print:block mb-8">
        <h1 className="text-2xl font-bold text-esm-black">{project.projectName} — Status Report</h1>
        <p className="text-sm text-esm-grey">{project.customerName} · Generated {reportDate}</p>
      </div>

      {/* Summary */}
      <Card padding="md" className="mb-5 print:border-0 print:shadow-none print:!p-0">
        <SectionLabel className="mb-3">Project Summary</SectionLabel>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div>
            <p className="text-[10px] font-bold text-esm-grey uppercase tracking-wider">Status</p>
            <div className="mt-1">
              <Badge variant={statusVariant[project.status] || "neutral"}>
                {project.status.replace(/_/g, " ")}
              </Badge>
            </div>
          </div>
          <div>
            <p className="text-[10px] font-bold text-esm-grey uppercase tracking-wider">Days to Go-Live</p>
            <p className="text-lg font-bold text-esm-black mt-0.5">{daysToGoLive ?? "TBD"}</p>
          </div>
          {milestoneMetric && (
            <div>
              <p className="text-[10px] font-bold text-esm-grey uppercase tracking-wider">Milestones</p>
              <p className="text-lg font-bold text-esm-black mt-0.5">{milestoneMetric.percent}%</p>
              <p className="text-xs text-esm-grey">{milestoneMetric.current} of {milestoneMetric.total}</p>
            </div>
          )}
          {integMetric && (
            <div>
              <p className="text-[10px] font-bold text-esm-grey uppercase tracking-wider">Integrations</p>
              <p className="text-lg font-bold text-esm-black mt-0.5">{integMetric.percent}%</p>
              <p className="text-xs text-esm-grey">{integMetric.current} of {integMetric.total}</p>
            </div>
          )}
        </div>
      </Card>

      {/* Milestones */}
      <Card padding="md" className="mb-5 print:border-0 print:shadow-none print:!p-0 print:break-inside-avoid">
        <SectionLabel className="mb-3">Key Milestones</SectionLabel>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-esm-border">
              <th className="text-left py-2 text-[10px] font-bold text-esm-grey uppercase tracking-wider">Milestone</th>
              <th className="text-left py-2 text-[10px] font-bold text-esm-grey uppercase tracking-wider w-24">Status</th>
              <th className="text-left py-2 text-[10px] font-bold text-esm-grey uppercase tracking-wider w-28">End Date</th>
            </tr>
          </thead>
          <tbody>
            {milestones
              .filter((m) => m.isMilestone || m.level === 1)
              .slice(0, 15)
              .map((m) => {
                const s = m.status.toLowerCase();
                const variant: BadgeVariant = s === "complete" ? "success" : s.includes("progress") ? "info" : "neutral";
                return (
                  <tr key={m.id} className="border-b border-gray-100">
                    <td className="py-2 text-esm-black">{m.name}</td>
                    <td className="py-2">
                      <Badge variant={variant} className="text-[10px]">{m.status}</Badge>
                    </td>
                    <td className="py-2 text-esm-grey">
                      {m.endDate ? parseLocalDate(m.endDate).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "—"}
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </Card>

      {/* Open Action Items */}
      {data.actionItems.length > 0 && (
        <Card padding="md" className="mb-5 print:border-0 print:shadow-none print:!p-0 print:break-inside-avoid">
          <SectionLabel className="mb-3">Open Action Items ({data.actionItems.length})</SectionLabel>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-esm-border">
                <th className="text-left py-2 text-[10px] font-bold text-esm-grey uppercase tracking-wider">Description</th>
                <th className="text-left py-2 text-[10px] font-bold text-esm-grey uppercase tracking-wider w-28">Owner</th>
                <th className="text-left py-2 text-[10px] font-bold text-esm-grey uppercase tracking-wider w-24">Due Date</th>
              </tr>
            </thead>
            <tbody>
              {data.actionItems.slice(0, 10).map((item) => (
                <tr key={item.id} className="border-b border-gray-100">
                  <td className="py-2 text-esm-black">{item.description}</td>
                  <td className="py-2 text-esm-grey">{item.owner || "—"}</td>
                  <td className="py-2 text-esm-grey">
                    {item.dueDate ? parseLocalDate(item.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {data.actionItems.length > 10 && (
            <p className="text-xs text-esm-muted mt-2">+ {data.actionItems.length - 10} more items</p>
          )}
        </Card>
      )}

      {/* Decisions */}
      {data.decisions.length > 0 && (
        <Card padding="md" className="mb-5 print:border-0 print:shadow-none print:!p-0 print:break-inside-avoid">
          <SectionLabel className="mb-3">Recent Decisions ({data.decisions.length})</SectionLabel>
          <ul className="space-y-2">
            {data.decisions.slice(0, 5).map((d) => (
              <li key={d.id} className="text-sm text-esm-black border-l-2 pl-3" style={{ borderColor: "var(--hub-accent, #F4333F)" }}>
                <p className="font-medium">{d.item}</p>
                {d.date && (
                  <p className="text-xs text-esm-grey mt-0.5">
                    {parseLocalDate(d.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* Footer */}
      <div className="text-center text-xs text-esm-muted py-4 print:mt-8">
        <p>Generated from ESM Implementation Customer Hub · {reportDate}</p>
        <p className="mt-0.5">
          NOTE: This content requires management review before sending.
        </p>
      </div>
    </div>
  );
}
