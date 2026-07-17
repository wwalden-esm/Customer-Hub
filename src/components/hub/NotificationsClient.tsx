"use client";

import { useState, useEffect, useCallback } from "react";
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

interface NotificationPrefs {
  emailEnabled: boolean;
  questionReplies: boolean;
  milestoneUpdates: boolean;
  meetingReminders: boolean;
}

const DEFAULT_PREFS: NotificationPrefs = {
  emailEnabled: true,
  questionReplies: true,
  milestoneUpdates: true,
  meetingReminders: true,
};

export default function NotificationsClient({
  notifications,
  projectId,
}: {
  notifications: Notification[];
  projectId: string;
}) {
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<Filter>("all");
  const [showPrefs, setShowPrefs] = useState(false);
  const [prefs, setPrefs] = useState<NotificationPrefs>(DEFAULT_PREFS);
  const [prefsLoading, setPrefsLoading] = useState(false);
  const [prefsSaving, setPrefsSaving] = useState(false);
  const [prefsSaved, setPrefsSaved] = useState(false);

  useEffect(() => {
    if (!projectId) return;
    setPrefsLoading(true);
    fetch(`/api/projects/${projectId}/notification-prefs`)
      .then((r) => r.json())
      .then((data) => {
        if (data.prefs) setPrefs(data.prefs);
      })
      .catch(() => {})
      .finally(() => setPrefsLoading(false));
  }, [projectId]);

  const savePrefs = useCallback(
    (updated: NotificationPrefs) => {
      setPrefsSaving(true);
      setPrefsSaved(false);
      fetch(`/api/projects/${projectId}/notification-prefs`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updated),
      })
        .then((r) => r.json())
        .then((data) => {
          if (data.prefs) setPrefs(data.prefs);
          setPrefsSaved(true);
          setTimeout(() => setPrefsSaved(false), 2000);
        })
        .catch(() => {})
        .finally(() => setPrefsSaving(false));
    },
    [projectId]
  );

  function updatePref<K extends keyof NotificationPrefs>(key: K, value: NotificationPrefs[K]) {
    const updated = { ...prefs, [key]: value };
    setPrefs(updated);
    savePrefs(updated);
  }

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
        <div className="flex items-center gap-3">
          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              className="text-xs font-medium text-esm-red-text hover:underline"
            >
              Mark all as read
            </button>
          )}
          <button
            onClick={() => setShowPrefs(!showPrefs)}
            className="text-esm-grey hover:text-esm-black transition-colors"
            aria-label="Notification preferences"
            title="Notification preferences"
          >
            <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
        </div>
      </div>

      {showPrefs && (
        <Card padding="sm" className="mb-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-esm-black">Notification Preferences</h3>
            <div className="flex items-center gap-2">
              {prefsSaved && (
                <span className="text-[10px] text-emerald-600 font-medium">Saved</span>
              )}
              {prefsSaving && (
                <span className="text-[10px] text-esm-muted">Saving...</span>
              )}
            </div>
          </div>
          {prefsLoading ? (
            <p className="text-xs text-esm-muted py-2">Loading preferences...</p>
          ) : (
            <div className="space-y-3">
              {/* Master toggle */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-esm-black">Email Notifications</p>
                  <p className="text-[11px] text-esm-muted">Receive email alerts for hub activity</p>
                </div>
                <button
                  role="switch"
                  aria-checked={prefs.emailEnabled}
                  aria-label="Email Notifications"
                  onClick={() => updatePref("emailEnabled", !prefs.emailEnabled)}
                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                    !prefs.emailEnabled ? "bg-gray-200" : ""
                  }`}
                  style={prefs.emailEnabled ? { backgroundColor: "var(--hub-accent, #F4333F)" } : undefined}
                >
                  <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${
                    prefs.emailEnabled ? "translate-x-4" : "translate-x-0.5"
                  }`} />
                </button>
              </div>

              <div className="border-t border-gray-100 pt-3 space-y-3">
                {/* Question Replies */}
                <div className="flex items-center justify-between">
                  <div className={!prefs.emailEnabled ? "opacity-50" : ""}>
                    <p className="text-sm text-esm-black">Question Replies</p>
                    <p className="text-[11px] text-esm-muted">When someone replies to your questions</p>
                  </div>
                  <button
                    role="switch"
                    aria-checked={prefs.questionReplies && prefs.emailEnabled}
                    aria-label="Question Replies"
                    onClick={() => updatePref("questionReplies", !prefs.questionReplies)}
                    disabled={!prefs.emailEnabled}
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                      prefs.questionReplies && prefs.emailEnabled ? "" : "bg-gray-200"
                    } ${!prefs.emailEnabled ? "opacity-50 cursor-not-allowed" : ""}`}
                    style={prefs.questionReplies && prefs.emailEnabled ? { backgroundColor: "var(--hub-accent, #F4333F)" } : undefined}
                  >
                    <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${
                      prefs.questionReplies && prefs.emailEnabled ? "translate-x-4" : "translate-x-0.5"
                    }`} />
                  </button>
                </div>

                {/* Milestone Updates */}
                <div className="flex items-center justify-between">
                  <div className={!prefs.emailEnabled ? "opacity-50" : ""}>
                    <p className="text-sm text-esm-black">Milestone Updates</p>
                    <p className="text-[11px] text-esm-muted">When project milestones change status</p>
                  </div>
                  <button
                    role="switch"
                    aria-checked={prefs.milestoneUpdates && prefs.emailEnabled}
                    aria-label="Milestone Updates"
                    onClick={() => updatePref("milestoneUpdates", !prefs.milestoneUpdates)}
                    disabled={!prefs.emailEnabled}
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                      prefs.milestoneUpdates && prefs.emailEnabled ? "" : "bg-gray-200"
                    } ${!prefs.emailEnabled ? "opacity-50 cursor-not-allowed" : ""}`}
                    style={prefs.milestoneUpdates && prefs.emailEnabled ? { backgroundColor: "var(--hub-accent, #F4333F)" } : undefined}
                  >
                    <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${
                      prefs.milestoneUpdates && prefs.emailEnabled ? "translate-x-4" : "translate-x-0.5"
                    }`} />
                  </button>
                </div>

                {/* Meeting Reminders */}
                <div className="flex items-center justify-between">
                  <div className={!prefs.emailEnabled ? "opacity-50" : ""}>
                    <p className="text-sm text-esm-black">Meeting Reminders</p>
                    <p className="text-[11px] text-esm-muted">Upcoming meeting notifications</p>
                  </div>
                  <button
                    role="switch"
                    aria-checked={prefs.meetingReminders && prefs.emailEnabled}
                    aria-label="Meeting Reminders"
                    onClick={() => updatePref("meetingReminders", !prefs.meetingReminders)}
                    disabled={!prefs.emailEnabled}
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                      prefs.meetingReminders && prefs.emailEnabled ? "" : "bg-gray-200"
                    } ${!prefs.emailEnabled ? "opacity-50 cursor-not-allowed" : ""}`}
                    style={prefs.meetingReminders && prefs.emailEnabled ? { backgroundColor: "var(--hub-accent, #F4333F)" } : undefined}
                  >
                    <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${
                      prefs.meetingReminders && prefs.emailEnabled ? "translate-x-4" : "translate-x-0.5"
                    }`} />
                  </button>
                </div>
              </div>
            </div>
          )}
        </Card>
      )}

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
