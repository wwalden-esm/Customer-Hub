"use client";

import { useMemo, useState } from "react";

interface TimelineMilestone {
  id: string;
  name: string;
  startDate: string | null;
  endDate: string | null;
  status: string;
  percentComplete: number | null;
}

interface ProjectTimelineProps {
  milestones: TimelineMilestone[];
  projectStart?: string;
  projectEnd?: string;
}

const STATUS_COLORS: Record<string, { bar: string; bg: string; text: string }> = {
  complete: { bar: "bg-emerald-500", bg: "bg-emerald-50", text: "text-emerald-700" },
  "in-progress": { bar: "bg-blue-500", bg: "bg-blue-50", text: "text-blue-700" },
  upcoming: { bar: "bg-slate-300", bg: "bg-slate-50", text: "text-slate-500" },
  current: { bar: "bg-blue-500", bg: "bg-blue-50", text: "text-blue-700" },
  overdue: { bar: "bg-red-500", bg: "bg-red-50", text: "text-red-700" },
  "on-hold": { bar: "bg-amber-400", bg: "bg-amber-50", text: "text-amber-700" },
};

function parseDate(d: string): Date {
  return new Date(d + "T00:00:00");
}

function fmtShort(d: string): string {
  return new Date(d + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function monthsBetween(start: Date, end: Date): Date[] {
  const months: Date[] = [];
  const cur = new Date(start.getFullYear(), start.getMonth(), 1);
  while (cur <= end) {
    months.push(new Date(cur));
    cur.setMonth(cur.getMonth() + 1);
  }
  return months;
}

export default function ProjectTimeline({ milestones, projectStart, projectEnd }: ProjectTimelineProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const { items, rangeStart, rangeEnd, months } = useMemo(() => {
    const valid = milestones.filter((m) => m.startDate || m.endDate);
    if (valid.length === 0) {
      return { items: [], rangeStart: new Date(), rangeEnd: new Date(), totalDays: 1, months: [] };
    }

    const allDates: Date[] = [];
    for (const m of valid) {
      if (m.startDate) allDates.push(parseDate(m.startDate));
      if (m.endDate) allDates.push(parseDate(m.endDate));
    }
    if (projectStart) allDates.push(parseDate(projectStart));
    if (projectEnd) allDates.push(parseDate(projectEnd));

    const minDate = new Date(Math.min(...allDates.map((d) => d.getTime())));
    const maxDate = new Date(Math.max(...allDates.map((d) => d.getTime())));

    const padDays = 14;
    const rStart = new Date(minDate);
    rStart.setDate(rStart.getDate() - padDays);
    const rEnd = new Date(maxDate);
    rEnd.setDate(rEnd.getDate() + padDays);

    const days = Math.max(1, Math.ceil((rEnd.getTime() - rStart.getTime()) / (1000 * 60 * 60 * 24)));
    const ms = monthsBetween(rStart, rEnd);

    const items = valid.map((m) => {
      const s = m.startDate ? parseDate(m.startDate) : parseDate(m.endDate!);
      const e = m.endDate ? parseDate(m.endDate) : parseDate(m.startDate!);
      const leftPct = ((s.getTime() - rStart.getTime()) / (rEnd.getTime() - rStart.getTime())) * 100;
      const widthPct = Math.max(1.5, ((e.getTime() - s.getTime()) / (rEnd.getTime() - rStart.getTime())) * 100);
      return { ...m, leftPct, widthPct };
    });

    return { items, rangeStart: rStart, rangeEnd: rEnd, totalDays: days, months: ms };
  }, [milestones, projectStart, projectEnd]);

  if (items.length === 0) {
    return (
      <section className="bg-white rounded-sm border border-[#E2E0E1] p-5" aria-labelledby="timeline-heading-empty">
        <h2 id="timeline-heading-empty" className="text-[10px] font-extrabold text-esm-grey tracking-[0.09em] uppercase mb-4">Project Timeline</h2>
        <p className="text-sm text-slate-500 text-center py-6">No milestone dates available for timeline view.</p>
      </section>
    );
  }

  const todayPct = (() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const pct = ((now.getTime() - rangeStart.getTime()) / (rangeEnd.getTime() - rangeStart.getTime())) * 100;
    return pct >= 0 && pct <= 100 ? pct : null;
  })();

  return (
    <section className="bg-white rounded-sm border border-[#E2E0E1] p-5" aria-labelledby="timeline-heading">
      <h2 id="timeline-heading" className="text-[10px] font-extrabold text-esm-grey tracking-[0.09em] uppercase mb-4">Project Timeline</h2>

      <div className="overflow-x-auto">
        <div className="min-w-[700px]">
          {/* Month headers */}
          <div className="relative h-6 border-b border-[#E2E0E1] mb-2">
            {months.map((m, i) => {
              const leftPct = ((m.getTime() - rangeStart.getTime()) / (rangeEnd.getTime() - rangeStart.getTime())) * 100;
              if (leftPct < 0 || leftPct > 100) return null;
              return (
                <div
                  key={i}
                  className="absolute text-[10px] font-medium text-[#9E9B9E] uppercase tracking-wider"
                  style={{ left: `${leftPct}%` }}
                >
                  {m.toLocaleDateString("en-US", { month: "short", year: "2-digit" })}
                </div>
              );
            })}
          </div>

          {/* Grid lines + today marker */}
          <div className="relative" role="img" aria-label={`Project timeline with ${items.length} milestones`}>
            {/* Vertical month grid lines */}
            {months.map((m, i) => {
              const leftPct = ((m.getTime() - rangeStart.getTime()) / (rangeEnd.getTime() - rangeStart.getTime())) * 100;
              if (leftPct < 0 || leftPct > 100) return null;
              return (
                <div
                  key={i}
                  className="absolute top-0 bottom-0 w-px bg-gray-100"
                  style={{ left: `${leftPct}%`, height: `${items.length * 40 + 8}px` }}
                  aria-hidden="true"
                />
              );
            })}

            {/* Today marker */}
            {todayPct !== null && (
              <div
                className="absolute top-0 w-px bg-red-400 z-10"
                style={{ left: `${todayPct}%`, height: `${items.length * 40 + 8}px` }}
                aria-hidden="true"
              >
                <div className="absolute -top-5 -translate-x-1/2 text-[9px] font-bold text-red-500 bg-red-50 px-1 rounded-sm">
                  TODAY
                </div>
              </div>
            )}

            {/* Bars */}
            {items.map((item) => {
              const colors = STATUS_COLORS[item.status] || STATUS_COLORS.upcoming;
              const isHovered = hoveredId === item.id;

              return (
                <div
                  key={item.id}
                  className="relative h-8 mb-2 flex items-center"
                  onMouseEnter={() => setHoveredId(item.id)}
                  onMouseLeave={() => setHoveredId(null)}
                >
                  {/* Bar */}
                  <div
                    className={`absolute h-6 rounded-sm transition-all ${colors.bar} ${isHovered ? "opacity-100 shadow-sm" : "opacity-80"}`}
                    style={{ left: `${item.leftPct}%`, width: `${item.widthPct}%` }}
                  >
                    {item.percentComplete != null && item.status !== "complete" && (
                      <div
                        className="absolute inset-y-0 left-0 rounded-l-sm bg-white/25"
                        style={{ width: `${Math.round(item.percentComplete * 100)}%` }}
                      />
                    )}
                    {item.widthPct > 12 && (
                      <span className="absolute inset-0 flex items-center px-2 text-[10px] font-medium text-white truncate">
                        {item.name}
                      </span>
                    )}
                  </div>

                  {/* Tooltip */}
                  {isHovered && (
                    <div
                      className="absolute z-20 bg-esm-black text-white text-xs rounded-sm px-3 py-2 shadow-lg pointer-events-none whitespace-nowrap"
                      style={{
                        left: `${Math.min(item.leftPct + item.widthPct / 2, 80)}%`,
                        top: "-44px",
                        transform: "translateX(-50%)",
                      }}
                    >
                      <div className="font-medium">{item.name}</div>
                      <div className="text-white/70">
                        {item.startDate && fmtShort(item.startDate)}
                        {item.startDate && item.endDate && " → "}
                        {item.endDate && fmtShort(item.endDate)}
                        {item.percentComplete != null && ` · ${Math.round(item.percentComplete * 100)}%`}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex gap-4 mt-4 pt-3 border-t border-[#E2E0E1]">
            {[
              { label: "Complete", color: "bg-emerald-500" },
              { label: "In Progress", color: "bg-blue-500" },
              { label: "Upcoming", color: "bg-slate-300" },
            ].map((l) => (
              <div key={l.label} className="flex items-center gap-1.5 text-[10px] text-esm-grey">
                <div className={`w-3 h-2 rounded-sm ${l.color}`} aria-hidden="true" />
                {l.label}
              </div>
            ))}
            {todayPct !== null && (
              <div className="flex items-center gap-1.5 text-[10px] text-esm-grey">
                <div className="w-3 h-px bg-red-400" aria-hidden="true" />
                Today
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
