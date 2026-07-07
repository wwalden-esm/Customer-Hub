import type { HubMilestone } from "@/types/hub";

function fmtShort(d: string) {
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function MilestoneLine({ milestones }: { milestones: HubMilestone[] }) {
  const completed = milestones.filter((m) => m.status === "complete").length;
  const railPct = milestones.length > 1 ? (completed / (milestones.length - 1)) * 100 : 0;

  const HEALTH_DOT: Record<string, string> = {
    Green: "#22c55e",
    Yellow: "#eab308",
    Red: "#ef4444",
    Blue: "#3b82f6",
  };

  return (
    <section className="bg-white border border-[#E2E0E1] rounded-sm px-6 pt-6 pb-7 mb-5" aria-labelledby="milestones-heading">
      <h2 id="milestones-heading" className="text-[10px] font-extrabold text-esm-grey tracking-[0.09em] uppercase mb-7">
        Project Milestones
      </h2>
      <div className="overflow-x-auto pb-1" role="list" aria-label={`${completed} of ${milestones.length} milestones complete`}>
        <div className="flex items-start min-w-max relative">
          {/* Rail background */}
          <div className="absolute top-[7px] left-5 right-5 h-0.5 bg-[#E2E0E1] z-0" aria-hidden="true" />
          {/* Rail progress */}
          <div
            className="absolute top-[7px] left-5 h-0.5 z-[1] transition-[width] duration-500"
            style={{ width: `calc(${railPct}% - 20px)`, backgroundColor: "var(--hub-accent)" }}
            aria-hidden="true"
          />
          {milestones.map((m) => {
            const isC = m.status === "complete";
            const isI = m.status === "in-progress";
            const isH = m.status === "on-hold";

            const dotStyle: React.CSSProperties = isC
              ? { backgroundColor: "var(--hub-accent)", borderColor: "var(--hub-accent)" }
              : isI
                ? { backgroundColor: "#fff", borderColor: "var(--hub-accent)", boxShadow: "0 0 0 3px var(--hub-accent-light, rgba(244,51,63,0.15))" }
                : isH
                  ? { backgroundColor: "#dbeafe", borderColor: "#3b82f6" }
                  : { backgroundColor: "#f9fafb", borderColor: "#E2E0E1" };

            const cardStyle: React.CSSProperties = isC
              ? { backgroundColor: "var(--hub-accent-light, #FEF2F2)", borderColor: "var(--hub-accent-border, rgba(244,51,63,0.4))" }
              : isI
                ? { backgroundColor: "var(--hub-accent-light, #FFF3F3)", borderColor: "var(--hub-accent-border, rgba(244,51,63,0.5))" }
                : isH
                  ? { backgroundColor: "#eff6ff", borderColor: "#93c5fd" }
                  : {};

            const cardCls = !isC && !isI && !isH ? "bg-gray-50 border-[#E2E0E1]" : "";

            const statusText = isC ? "Complete" : isI ? "Active" : isH ? "On Hold" : "Upcoming";
            const label = isC ? "✓ Done" : isI ? "Active" : isH ? "On Hold" : "Upcoming";
            const labelStyle: React.CSSProperties = isC || isI ? { color: "var(--hub-accent)" } : {};
            const labelCls = isC || isI ? "" : isH ? "text-blue-600" : "text-[#9E9B9E]";

            return (
              <div key={m.id} className="flex flex-col items-center w-[140px] shrink-0" role="listitem" aria-label={`${m.name}: ${statusText}${m.date ? `, ${fmtShort(m.date)}` : ""}`}>
                <div className="flex items-center w-full mb-3 relative z-[2]">
                  <div className="flex-1" />
                  <div className="w-3.5 h-3.5 rounded-full border-2 shrink-0" style={dotStyle} aria-hidden="true" />
                  <div className="flex-1" />
                </div>
                <div className={`border rounded-sm p-2.5 w-[118px] text-center ${cardCls}`} style={cardStyle}>
                  <div className="flex items-center justify-center gap-1 mb-1">
                    {m.health && m.health !== "Green" && (
                      <span
                        className="inline-block w-1.5 h-1.5 rounded-full shrink-0"
                        style={{ backgroundColor: HEALTH_DOT[m.health] }}
                        aria-label={`Health: ${m.health}`}
                      />
                    )}
                    <span className={`text-[9px] font-extrabold tracking-wider uppercase ${labelCls}`} style={labelStyle}>
                      {label}
                    </span>
                  </div>
                  <div className="text-xs font-bold text-esm-black leading-tight mb-1">{m.name}</div>
                  {m.date && <div className="text-[11px] text-esm-grey">{fmtShort(m.date)}</div>}
                  {m.percentComplete != null && m.percentComplete > 0 && m.percentComplete < 1 && (
                    <div className="mt-1.5 w-full h-1 bg-[#E2E0E1] rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${Math.round(m.percentComplete * 100)}%`, backgroundColor: "var(--hub-accent)" }}
                      />
                    </div>
                  )}
                  {m.phase && (
                    <span className="inline-block mt-1 text-[9px] text-esm-grey bg-black/5 rounded-sm px-1.5 py-px">
                      {m.phase}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
