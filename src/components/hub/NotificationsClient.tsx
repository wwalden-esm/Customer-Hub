"use client";

import { useState } from "react";
import { Card } from "@/components/ui";

interface Notification {
  id: string;
  title: string;
  detail: string;
  timestamp: string;
  type: string;
}

const TYPE_ICONS: Record<string, { icon: string; bg: string; color: string }> = {
  milestone: { icon: "◆", bg: "bg-emerald-100", color: "text-emerald-600" },
  document: { icon: "◧", bg: "bg-blue-100", color: "text-blue-600" },
  raid: { icon: "⚑", bg: "bg-amber-100", color: "text-amber-600" },
  status: { icon: "●", bg: "bg-purple-100", color: "text-purple-600" },
  upload: { icon: "↑", bg: "bg-indigo-100", color: "text-indigo-600" },
  system: { icon: "⚙", bg: "bg-slate-100", color: "text-slate-600" },
};

type Filter = "all" | "unread" | "milestone" | "document" | "raid";

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

export default function NotificationsClient({ notifications }: { notifications: Notification[] }) {
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<Filter>("all");

  function markRead(id: string) {
    setReadIds((prev) => new Set(prev).add(id));
  }

  function markAllRead() {
    setReadIds(new Set(notifications.map((n) => n.id)));
  }

  const filtered = notifications.filter((n) => {
    if (filter === "unread") return !readIds.has(n.id);
    if (filter === "all") return true;
    return n.type === filter;
  });

  const unreadCount = notifications.filter((n) => !readIds.has(n.id)).length;

  const FILTERS: { key: Filter; label: string }[] = [
    { key: "all", label: "All" },
    { key: "unread", label: "Unread" },
    { key: "milestone", label: "Milestones" },
    { key: "document", label: "Documents" },
    { key: "raid", label: "RAID" },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
                filter === f.key
                  ? "bg-esm-black text-white"
                  : "bg-white text-esm-grey border border-esm-border hover:border-esm-black"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            className="text-xs font-medium hover:underline"
            style={{ color: "var(--hub-accent, #F4333F)" }}
          >
            Mark all as read
          </button>
        )}
      </div>

      {filtered.length === 0 ? (
        <Card padding="lg" className="!p-8 text-center">
          <p className="text-sm text-esm-grey">
            {filter === "unread" ? "All caught up!" : "No notifications yet."}
          </p>
        </Card>
      ) : (
        <Card padding="sm" className="!p-0 overflow-hidden divide-y divide-gray-100">
          {filtered.map((n) => {
            const isRead = readIds.has(n.id);
            const style = TYPE_ICONS[n.type] || TYPE_ICONS.system;

            return (
              <button
                key={n.id}
                onClick={() => markRead(n.id)}
                className={`w-full text-left px-5 py-4 flex items-start gap-3 hover:bg-gray-50 transition-colors ${
                  !isRead ? "bg-blue-50/30" : ""
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm shrink-0 mt-0.5 ${style.bg} ${style.color}`}
                  aria-hidden="true"
                >
                  {style.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className={`text-sm leading-snug ${!isRead ? "font-medium text-esm-black" : "text-esm-grey"}`}>
                      {n.title}
                    </p>
                    <span className="text-[10px] text-esm-muted shrink-0 mt-0.5">
                      {relativeTime(n.timestamp)}
                    </span>
                  </div>
                  {n.detail && (
                    <p className="text-xs text-esm-muted mt-0.5 line-clamp-2">{n.detail}</p>
                  )}
                </div>
                {!isRead && (
                  <div className="w-2 h-2 rounded-full bg-esm-red shrink-0 mt-2" aria-label="Unread" />
                )}
              </button>
            );
          })}
        </Card>
      )}

      <p className="text-[10px] text-esm-muted mt-3 text-center">
        Showing notifications from the last 30 days
      </p>
    </div>
  );
}
