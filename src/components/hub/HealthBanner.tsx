import StatusPill from "./StatusPill";
import type { HubDashboardData } from "@/types/hub";
import { parseLocalDate } from "@/lib/date-utils";
import { Card } from "@/components/ui";

function healthSummary(data: HubDashboardData): string {
  const goLive = data.project.goLiveDate
    ? parseLocalDate(data.project.goLiveDate).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "TBD";
  const days = data.daysToGoLive;
  const phase = data.project.currentPhase || "the next phase";

  if (data.project.status === "ON_TRACK") {
    return `Your implementation is on track for a ${goLive} go-live${days !== null ? `, with ${days} days remaining` : ""}. The team is currently in ${phase} — no escalations are open, and the project is progressing as planned.`;
  }
  if (data.project.status === "AT_RISK") {
    return `Your implementation has open items that may affect the ${goLive} go-live timeline${days !== null ? `, with ${days} days remaining` : ""}. The team is working through ${phase} — your ESM consultant will reach out this week to align on a resolution path.`;
  }
  return `Your implementation currently requires immediate attention. The ${goLive} go-live target${days !== null ? ` with ${days} days remaining` : ""} is under review. Please prioritize the open items below — your ESM consultant will schedule a call with your team this week.`;
}

const BORDER_COLOR: Record<string, string> = {
  ON_TRACK: "#2D2826",
  AT_RISK: "#686468",
  OFF_TRACK: "#F4333F",
};

export default function HealthBanner({ data }: { data: HubDashboardData }) {
  return (
    <section aria-labelledby="health-heading">
    <Card
      padding="lg"
      className="mb-5"
      accent="left"
      accentColor={BORDER_COLOR[data.project.status]}
    >
      <div className="flex items-center gap-3 mb-3">
        <h2 id="health-heading" className="sr-only">Project Health</h2>
        <StatusPill status={data.project.status} />
        <span className="text-xs text-esm-muted">
          Updated{" "}
          {new Date().toLocaleDateString("en-US", {
            month: "long",
            day: "numeric",
            year: "numeric",
          })}
        </span>
      </div>
      <p className="text-base leading-[1.7] text-esm-black">{healthSummary(data)}</p>
      <div className="flex flex-wrap gap-x-6 gap-y-1 mt-3 text-xs text-esm-grey">
        {(() => {
          const completed = data.milestones.filter((m) => m.status === "complete").length;
          const inProgress = data.milestones.filter((m) => m.status === "in-progress").length;
          const openItems = data.actionItems.length;
          const overdue = data.actionItems.filter((a) => a.isOverdue).length;
          const parts: string[] = [];
          if (data.milestones.length > 0) parts.push(`${completed} of ${data.milestones.length} milestones complete${inProgress > 0 ? `, ${inProgress} in progress` : ""}`);
          if (openItems > 0) parts.push(`${openItems} open action item${openItems !== 1 ? "s" : ""}${overdue > 0 ? `, ${overdue} overdue` : ""}`);
          return parts.map((p, i) => <span key={i}>{p}</span>);
        })()}
      </div>
    </Card>
    </section>
  );
}
