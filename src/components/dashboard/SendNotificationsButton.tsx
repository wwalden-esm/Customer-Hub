"use client";

import { useState } from "react";

interface NotificationSummary {
  sent: Array<{ projectId: string; customerName: string; itemCount: number }>;
  skipped: number;
  errors: string[];
}

export default function SendNotificationsButton() {
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<NotificationSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSend() {
    setSending(true);
    setResult(null);
    setError(null);

    try {
      const res = await fetch("/api/admin/send-notifications", { method: "POST" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to send notifications");
      }
      const data: NotificationSummary = await res.json();
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send notifications");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={handleSend}
        disabled={sending}
        className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-esm-red hover:bg-esm-red/90 rounded transition-colors disabled:opacity-50"
      >
        {sending ? (
          <>
            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Sending...
          </>
        ) : (
          <>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            Send Notifications
          </>
        )}
      </button>

      {result && result.sent.length > 0 && (
        <span className="text-sm text-green-700">
          Sent {result.sent.length} notification{result.sent.length > 1 ? "s" : ""}:
          {" "}{result.sent.map((s) => `${s.customerName} (${s.itemCount})`).join(", ")}
        </span>
      )}
      {result && result.sent.length === 0 && (
        <span className="text-sm text-slate-500">No projects with overdue or upcoming items</span>
      )}
      {result && result.errors.length > 0 && (
        <span className="text-sm text-esm-red">{result.errors[0]}</span>
      )}
      {error && <span className="text-sm text-esm-red">{error}</span>}
    </div>
  );
}
