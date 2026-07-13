"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { SectionLabel } from "@/components/ui";

interface Notification {
  id: string;
  title: string;
  detail: string;
  timestamp: string;
  read: boolean;
}

export default function NotificationBell({ projectId }: { projectId: string }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    async function fetchNotifications() {
      try {
        const res = await fetch(`/api/projects/${projectId}/notifications`);
        if (res.ok) {
          const data = await res.json();
          setNotifications(data.notifications || []);
        }
      } catch {
        // silent fail
      }
    }
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60_000);
    return () => clearInterval(interval);
  }, [projectId]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setOpen(false);
      buttonRef.current?.focus();
    }
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  async function markRead(id: string) {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  }

  return (
    <div className="relative" ref={ref} onKeyDown={handleKeyDown}>
      <button
        ref={buttonRef}
        onClick={() => setOpen(!open)}
        className="relative text-white/80 hover:text-white transition-colors"
        aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ""}`}
        aria-expanded={open}
        aria-haspopup="true"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-esm-red text-white text-[10px] font-bold rounded-full flex items-center justify-center" aria-hidden="true">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>
      {open && (
        <div
          className="absolute right-0 sm:right-0 top-8 w-[calc(100vw-2rem)] sm:w-80 max-w-80 bg-white rounded-card border border-esm-border shadow-lg z-50 max-h-80 overflow-y-auto"
          role="region"
          aria-label="Notifications"
        >
          <div className="px-4 py-3 border-b border-esm-border">
            <SectionLabel>Notifications</SectionLabel>
          </div>
          {notifications.length === 0 ? (
            <div className="px-4 py-6 text-center text-sm text-esm-grey">No notifications</div>
          ) : (
            <ul role="list">
              {notifications.slice(0, 10).map((n) => (
                <li key={n.id}>
                  <button
                    onClick={() => markRead(n.id)}
                    className={`w-full text-left px-4 py-3 border-b border-gray-50 hover:bg-gray-50 transition-colors ${
                      !n.read ? "bg-blue-50/30" : ""
                    }`}
                    aria-label={`${n.read ? "" : "Unread: "}${n.title}. ${n.detail}`}
                  >
                    <div className="flex items-start gap-2">
                      {!n.read && <div className="w-2 h-2 rounded-full bg-esm-red mt-1.5 shrink-0" aria-hidden="true" />}
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-esm-black">{n.title}</p>
                        <p className="text-xs text-esm-grey mt-0.5 line-clamp-2">{n.detail}</p>
                        <p className="text-[10px] text-esm-muted mt-1">
                          {new Date(n.timestamp).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                        </p>
                      </div>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
          <a
            href="/hub/notifications"
            className="block text-center text-xs font-medium py-2 border-t border-esm-border hover:bg-gray-50 transition-colors"
            style={{ color: "var(--hub-accent, #F4333F)" }}
          >
            View all notifications
          </a>
        </div>
      )}
    </div>
  );
}
