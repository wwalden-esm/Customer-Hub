"use client";

import { useState } from "react";
import type { HubMilestone } from "@/types/hub";
import { parseLocalDate } from "@/lib/date-utils";
import { SectionLabel, Card } from "@/components/ui";

function fmtShort(d: string) {
  return parseLocalDate(d).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function fmtFull(d: string) {
  return parseLocalDate(d).toLocaleDateString("en-US", { weekday: "short", month: "long", day: "numeric", year: "numeric" });
}

export default function MilestoneLine({ milestones }: { milestones: HubMilestone[] }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const completed = milestones.filter((m) => m.status === "complete").length;
  const railPct = milestones.length > 1 ? (completed / (milestones.length - 1)) * 100 : 0;

  const HEALTH_DOT: Record<string, string> = {
    Green: "#22c55e",
    Yellow: "#eab308",
    Red: "#ef4444",
    Blue: "#3b82f6",
  };

  const expanded = expandedId ? milestones.find((m) => m.id === expandedId) : null;

  return (
    <section className="mb-5" aria-labelledby="milestones-heading">
      <Card padding="sm" className="!px-6 !pt-6 !pb-7">
      <SectionLabel className="mb-7"><h2 id="milestones-heading">
        Project Milestones
      </h2></SectionLabel>
      <div className="overflow-x-auto pb-1" role="list" aria-label={`${completed} of ${milestones.length} milestones complete`}>
        <div className="flex items-start min-w-max relative">
          <div className="absolute top-[7px] left-5 right-5 h-0.5 bg-[#E2E0E1] z-0" aria-hidden="true" />
          <div
            className="absolute top-[7px] left-5 h-0.5 z-[1] transition-[width] duration-500"
            style={{ width: `calc(${railPct}% - 20px)`, backgroundColor: "var(--hub-accent)" }}
            aria-hidden="true"
          />
          {milestones.map((m) => {
            const isC = m.status === "complete";
            const isI = m.status === "in-progress";
            const isH = m.status === "on-hold";
            const isExpanded = expandedId === m.id;

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

            const cardCls = !isC && !isI && !isH ? "bg-gray-50 border-esm-border" : "";

            const statusText = isC ? "Complete" : isI ? "Active" : isH ? "On Hold" : "Upcoming";
            const label = isC ? "✓ Done" : isI ? "Active" : isH ? "On Hold" : "Upcoming";
            const labelStyle: React.CSSProperties = isC || isI ? { color: "var(--hub-accent)" } : {};
            const labelCls = isC || isI ? "" : isH ? "text-blue-600" : "text-esm-muted";

            return (
              <div key={m.id} className="flex flex-col items-center w-[140px] shrink-0" role="listitem" aria-label={`${m.name}: ${statusText}${m.date ? `, ${fmtShort(m.date)}` : ""}`}>
                <div className="flex items-center w-full mb-3 relative z-[2]">
                  <div className="flex-1" />
                  <div className="w-3.5 h-3.5 rounded-full border-2 shrink-0" style={dotStyle} aria-hidden="true" />
                  <div className="flex-1" />
                </div>
                <button
                  onClick={() => setExpandedId(isExpanded ? null : m.id)}
                  className={`border rounded-card p-2.5 w-[118px] text-center cursor-pointer transition-shadow ${cardCls} ${isExpanded ? "ring-2 ring-offset-1" : "hover:shadow-md"}`}
                  style={{ ...cardStyle, ...(isExpanded ? { ringColor: "var(--hub-accent)" } : {}) }}
                  aria-expanded={isExpanded}
                >
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
                  {m.percentComplete != null && !isNaN(Number(m.percentComplete)) && Number(m.percentComplete) > 0 && Number(m.percentComplete) < 1 && (
                    <div className="mt-1.5 w-full h-1 bg-[#E2E0E1] rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${Math.round(m.percentComplete * 100)}%`, backgroundColor: "var(--hub-accent)" }}
                      />
                    </div>
                  )}
                  {m.phase && (
                    <span className="inline-block mt-1 text-[9px] text-esm-grey bg-black/5 rounded-card px-1.5 py-px">
                      {m.phase}
                    </span>
                  )}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Expanded detail panel */}
      {expanded && (
        <div className="mt-4 p-4 border border-esm-border rounded-card bg-gray-50 animate-in slide-in-from-top-1">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-sm font-bold text-esm-black">{expanded.name}</h3>
              {expanded.phase && (
                <p className="text-xs text-esm-grey mt-0.5">Phase: {expanded.phase}</p>
              )}
            </div>
            <button onClick={() => setExpandedId(null)} className="text-esm-muted hover:text-esm-grey" aria-label="Close details">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
            <div>
              <p className="text-[10px] font-bold text-esm-grey uppercase tracking-wider">Status</p>
              <p className="text-sm text-esm-black mt-0.5 capitalize">{expanded.status}</p>
            </div>
            {expanded.date && (
              <div>
                <p className="text-[10px] font-bold text-esm-grey uppercase tracking-wider">Target Date</p>
                <p className="text-sm text-esm-black mt-0.5">{fmtFull(expanded.date)}</p>
              </div>
            )}
            {expanded.percentComplete != null && !isNaN(Number(expanded.percentComplete)) && (
              <div>
                <p className="text-[10px] font-bold text-esm-grey uppercase tracking-wider">Progress</p>
                <p className="text-sm text-esm-black mt-0.5">{Math.round(Number(expanded.percentComplete) * 100)}%</p>
              </div>
            )}
            {expanded.health && (
              <div>
                <p className="text-[10px] font-bold text-esm-grey uppercase tracking-wider">Health</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: HEALTH_DOT[expanded.health] || "#9ca3af" }} />
                  <span className="text-sm text-esm-black">{expanded.health}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      </Card>
    </section>
  );
}
