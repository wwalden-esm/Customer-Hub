"use client";

import { useState, useEffect, useRef } from "react";

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

  const unreadCount = notifications.filter((n) => !n.read).length;

  async function markRead(id: string) {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="relative text-white/60 hover:text-white transition-colors"
        title="Notifications"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-esm-red text-white text-[10px] font-bold rounded-full flex items-center justify-center">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 top-8 w-80 bg-white rounded-sm border border-[#E2E0E1] shadow-lg z-50 max-h-80 overflow-y-auto">
          <div className="px-4 py-3 border-b border-[#E2E0E1]">
            <span className="text-xs font-bold text-esm-grey uppercase tracking-wider">Notifications</span>
          </div>
          {notifications.length === 0 ? (
            <div className="px-4 py-6 text-center text-sm text-esm-grey">No notifications</div>
          ) : (
            notifications.slice(0, 10).map((n) => (
              <button
                key={n.id}
                onClick={() => markRead(n.id)}
                className={`w-full text-left px-4 py-3 border-b border-gray-50 hover:bg-gray-50 transition-colors ${
                  !n.read ? "bg-blue-50/30" : ""
                }`}
              >
                <div className="flex items-start gap-2">
                  {!n.read && <div className="w-2 h-2 rounded-full bg-esm-red mt-1.5 shrink-0" />}
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-esm-black">{n.title}</p>
                    <p className="text-xs text-esm-grey mt-0.5 line-clamp-2">{n.detail}</p>
                    <p className="text-[10px] text-[#9E9B9E] mt-1">
                      {new Date(n.timestamp).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                    </p>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
