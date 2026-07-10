"use client";

import { useState } from "react";

interface ActivityEvent {
  id: string;
  type: "milestone" | "document" | "raid" | "status" | "upload" | "system";
  title: string;
  detail: string | null;
  timestamp: string;
  actor: string | null;
}

const TYPE_ICONS: Record<string, { icon: string; bg: string; color: string }> = {
  milestone: { icon: "◆", bg: "bg-emerald-100", color: "text-emerald-600" },
  document: { icon: "◧", bg: "bg-blue-100", color: "text-blue-600" },
  raid: { icon: "⚑", bg: "bg-amber-100", color: "text-amber-600" },
  status: { icon: "●", bg: "bg-purple-100", color: "text-purple-600" },
  upload: { icon: "↑", bg: "bg-indigo-100", color: "text-indigo-600" },
  system: { icon: "⚙", bg: "bg-slate-100", color: "text-slate-600" },
};

const FILTER_LABELS: Record<string, string> = {
  all: "All",
  milestone: "Milestones",
  document: "Documents",
  raid: "RAID",
};

function relativeTime(ts: string): string {
  const diff = Date.now() - new Date(ts).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function groupByDate(events: ActivityEvent[]): Map<string, ActivityEvent[]> {
  const groups = new Map<string, ActivityEvent[]>();
  for (const e of events) {
    const d = new Date(e.timestamp);
    const key = d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
    const list = groups.get(key) ?? [];
    list.push(e);
    groups.set(key, list);
  }
  return groups;
}

export default function ActivityFeed({ events }: { events: ActivityEvent[] }) {
  const [filter, setFilter] = useState("all");
  const [limit, setLimit] = useState(15);

  const filtered = filter === "all" ? events : events.filter((e) => e.type === filter);
  const visible = filtered.slice(0, limit);
  const grouped = groupByDate(visible);
  const hasMore = filtered.length > limit;

  return (
    <section className="bg-white rounded-card border border-esm-border p-5" aria-labelledby="activity-heading">
      <div className="flex items-center justify-between mb-4">
        <h2 id="activity-heading" className="text-[10px] font-extrabold text-esm-grey tracking-[0.09em] uppercase">Activity</h2>
        <div className="flex gap-1" role="group" aria-label="Filter activity">
          {Object.entries(FILTER_LABELS).map(([key, label]) => (
            <button
              key={key}
              onClick={() => { setFilter(key); setLimit(15); }}
              aria-pressed={filter === key}
              className={`px-2 py-0.5 text-[10px] font-medium rounded-full transition-colors ${
                filter === key
                  ? "bg-esm-black text-white"
                  : "bg-gray-100 text-esm-grey hover:bg-gray-200"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {visible.length === 0 ? (
        <p className="text-sm text-esm-muted text-center py-6">No activity recorded yet.</p>
      ) : (
        <div className="space-y-4">
          {Array.from(grouped.entries()).map(([dateLabel, items]) => (
            <div key={dateLabel}>
              <div className="text-[10px] font-medium text-esm-muted uppercase tracking-wider mb-2">
                {dateLabel}
              </div>
              <ul className="space-y-0.5">
                {items.map((event) => {
                  const style = TYPE_ICONS[event.type] || TYPE_ICONS.system;
                  return (
                    <li
                      key={event.id}
                      className="flex items-start gap-3 py-2 px-2 rounded-card hover:bg-slate-50 transition-colors group"
                    >
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs shrink-0 mt-0.5 ${style.bg} ${style.color}`} aria-hidden="true">
                        {style.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-esm-black leading-snug">{event.title}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          {event.detail && (
                            <span className="text-xs text-esm-muted">{event.detail}</span>
                          )}
                          {event.actor && (
                            <>
                              <span className="text-[#E2E0E1]" aria-hidden="true">·</span>
                              <span className="text-xs text-esm-muted">{event.actor}</span>
                            </>
                          )}
                        </div>
                      </div>
                      <span className="text-[10px] text-esm-muted shrink-0 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {relativeTime(event.timestamp)}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      )}

      {hasMore && (
        <button
          onClick={() => setLimit((l) => l + 15)}
          className="w-full mt-3 py-1.5 text-xs text-esm-grey hover:text-esm-black border border-esm-border rounded-card hover:bg-slate-50 transition-colors"
        >
          Show more ({filtered.length - limit} remaining)
        </button>
      )}

      <div className="mt-3 pt-2 border-t border-esm-border text-[10px] text-esm-muted">
        {filtered.length} event{filtered.length !== 1 ? "s" : ""}
      </div>
    </section>
  );
}
