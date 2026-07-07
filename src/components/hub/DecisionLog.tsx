import type { HubDecision } from "@/types/hub";

function fmt(d: string) {
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function DecisionLog({ decisions, raidLogUrl }: { decisions: HubDecision[]; raidLogUrl?: string }) {
  if (decisions.length === 0) return null;

  return (
    <section className="bg-white border border-[#E2E0E1] rounded-sm overflow-hidden" aria-labelledby="decisions-heading">
      <div className="flex justify-between items-center px-5 py-3.5 border-b border-[#E2E0E1]">
        <h2 id="decisions-heading" className="text-[10px] font-extrabold text-esm-grey tracking-[0.09em] uppercase">
          Decision Log
        </h2>
        <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-sm border bg-gray-50 text-esm-grey border-[#E2E0E1]">
          {decisions.length} recorded
        </span>
      </div>
      <ul className="divide-y divide-gray-100">
        {decisions.slice(0, 5).map((d) => (
          <li key={d.id} className="px-5 py-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm text-esm-black leading-snug">{d.item}</p>
                {d.notes && (
                  <p className="text-xs text-[#9E9B9E] mt-1 leading-relaxed line-clamp-2">{d.notes}</p>
                )}
              </div>
              <div className="text-right shrink-0">
                <span className={`text-[10px] font-bold tracking-wide uppercase px-2 py-0.5 rounded-sm border ${
                  d.status === "Complete"
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : "bg-blue-50 text-blue-700 border-blue-200"
                }`}>
                  {d.status}
                </span>
                {d.date && (
                  <p className="text-[10px] text-[#9E9B9E] mt-1">{fmt(d.date)}</p>
                )}
              </div>
            </div>
          </li>
        ))}
      </ul>
      {(decisions.length > 5 || raidLogUrl) && (
        <div className="px-5 py-2.5 border-t border-[#E2E0E1] bg-gray-50">
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
    </section>
  );
}
