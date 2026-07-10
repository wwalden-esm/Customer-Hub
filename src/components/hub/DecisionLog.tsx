import type { HubDecision } from "@/types/hub";
import { parseLocalDate } from "@/lib/date-utils";
import { Badge, Card } from "@/components/ui";

function fmt(d: string) {
  return parseLocalDate(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function DecisionLog({ decisions, raidLogUrl }: { decisions: HubDecision[]; raidLogUrl?: string }) {
  if (decisions.length === 0) return null;

  return (
    <section aria-labelledby="decisions-heading">
      <Card padding="sm" className="!p-0 overflow-hidden">
      <div className="flex justify-between items-center px-5 py-3.5 border-b border-esm-border">
        <h2 id="decisions-heading" className="text-[10px] font-extrabold text-esm-grey tracking-[0.09em] uppercase">
          Decision Log
        </h2>
        <Badge variant="neutral" className="text-[11px] font-bold px-2.5">
          {decisions.length} recorded
        </Badge>
      </div>
      <ul className="divide-y divide-gray-100">
        {decisions.slice(0, 5).map((d) => (
          <li key={d.id} className="px-5 py-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm text-esm-black leading-snug">{d.item}</p>
                {d.notes && (
                  <p className="text-xs text-esm-muted mt-1 leading-relaxed line-clamp-2">{d.notes}</p>
                )}
              </div>
              <div className="text-right shrink-0">
                <Badge variant={d.status === "Complete" ? "success" : "info"} className="text-[10px] tracking-wide uppercase">
                  {d.status}
                </Badge>
                {d.date && (
                  <p className="text-[10px] text-esm-muted mt-1">{fmt(d.date)}</p>
                )}
              </div>
            </div>
          </li>
        ))}
      </ul>
      {(decisions.length > 5 || raidLogUrl) && (
        <div className="px-5 py-2.5 border-t border-esm-border bg-gray-50">
          <a
            href={raidLogUrl ?? "/hub/raid-log"}
            {...(raidLogUrl ? { target: "_blank", rel: "noopener noreferrer" } : {})}
            className="text-xs font-medium hover:underline"
            style={{ color: "var(--hub-accent, #F4333F)" }}
          >
            View all decisions{decisions.length > 5 ? ` (${decisions.length})` : ""} →
          </a>
        </div>
      )}
      </Card>
    </section>
  );
}
