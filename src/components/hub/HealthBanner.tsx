import StatusPill from "./StatusPill";
import type { HubDashboardData } from "@/types/hub";

function healthSummary(data: HubDashboardData): string {
  const goLive = data.project.goLiveDate
    ? new Date(data.project.goLiveDate).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "TBD";
  const days = data.daysToGoLive;
  const phase = data.milestones.find((m) => m.status === "current")?.phase || "the next phase";

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
    <div
      className="bg-white rounded-sm border border-[#E2E0E1] p-6 mb-5"
      style={{ borderLeftWidth: "4px", borderLeftColor: BORDER_COLOR[data.project.status] }}
    >
      <div className="flex items-center gap-3 mb-3">
        <StatusPill status={data.project.status} />
        <span className="text-xs text-[#9E9B9E]">
          Updated{" "}
          {new Date().toLocaleDateString("en-US", {
            month: "long",
            day: "numeric",
            year: "numeric",
          })}
        </span>
      </div>
      <p className="text-base leading-[1.7] text-esm-black">{healthSummary(data)}</p>
    </div>
  );
}
