import Link from "next/link";
import type { HubDecision } from "@/types/hub";
import { parseLocalDate } from "@/lib/date-utils";
import { Badge, SectionLabel, Card } from "@/components/ui";

function fmt(d: string) {
  return parseLocalDate(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function DecisionLog({ decisions, raidLogUrl, hideTitle }: { decisions: HubDecision[]; raidLogUrl?: string; hideTitle?: boolean }) {
  if (decisions.length === 0) return null;

  const linkProps = raidLogUrl
    ? { href: raidLogUrl, target: "_blank" as const, rel: "noopener noreferrer" as const }
    : { href: "/hub/raid-log" };

  return (
    <section aria-labelledby="decisions-heading">
      <Card padding="sm" className="!p-0 overflow-hidden">
      {!hideTitle && (
        <div className="flex justify-between items-center px-5 py-3.5 border-b border-esm-border">
          <SectionLabel><h2 id="decisions-heading">Decision Log</h2></SectionLabel>
          <Link
            {...linkProps}
            className="text-[11px] font-bold px-2.5 py-0.5 rounded-card border hover:opacity-80 transition-opacity bg-gray-50 text-esm-grey border-esm-border"
          >
            {decisions.length} recorded
          </Link>
        </div>
      )}
      {decisions.length === 0 ? (
        <div className="p-9 text-center text-esm-muted text-sm">No decisions recorded</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-50">
                {["Decision", "Date", "Status", ""].map((h) => (
                  <th
                    key={h || "link"}
                    scope="col"
                    className="px-[18px] py-2.5 text-[10px] font-extrabold text-esm-grey tracking-wider uppercase text-left border-b border-esm-border"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {decisions.slice(0, 3).map((d, i) => (
                <tr
                  key={d.id}
                  className={`group ${i < Math.min(decisions.length, 3) - 1 ? "border-b border-esm-border" : ""} hover:bg-slate-50 transition-colors`}
                >
                  <td className="px-[18px] py-3 text-sm text-esm-black leading-snug">
                    <Link {...linkProps} className="hover:underline">{d.item}</Link>
                    {d.notes && (
                      <p className="text-xs text-esm-muted mt-0.5 leading-relaxed line-clamp-1">{d.notes}</p>
                    )}
                  </td>
                  <td className="px-[18px] py-3 text-sm text-esm-black whitespace-nowrap">
                    {d.date ? fmt(d.date) : <span aria-label="No date">—</span>}
                  </td>
                  <td className="px-[18px] py-3">
                    <Badge variant={d.status === "Complete" ? "success" : "info"} className="text-[10px] tracking-wide uppercase">
                      {d.status}
                    </Badge>
                  </td>
                  <td className="px-[18px] py-3">
                    <svg className="w-3.5 h-3.5 text-esm-muted opacity-0 group-hover:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {(decisions.length > 3 || raidLogUrl) && (
        <div className="px-5 py-2.5 border-t border-esm-border bg-gray-50">
          <Link
            {...linkProps}
            className="text-xs font-medium hover:underline"
            style={{ color: "var(--hub-accent, #F4333F)" }}
          >
            See all decisions{decisions.length > 3 ? ` (${decisions.length})` : ""} →
          </Link>
        </div>
      )}
      </Card>
    </section>
  );
}
