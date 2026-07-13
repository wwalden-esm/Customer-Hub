"use client";

import { useEffect, useState, useRef, useCallback } from "react";

export default function SessionGuard() {
  const [state, setState] = useState<"ok" | "warning" | "expired">("ok");
  const btnRef = useRef<HTMLButtonElement>(null);
  const warningTimerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    function scheduleWarning() {
      clearTimeout(warningTimerRef.current);
      warningTimerRef.current = setTimeout(() => {
        setState("warning");
      }, 25 * 60 * 1000);
    }

    async function checkSession() {
      try {
        const res = await fetch("/api/auth/customer/check", { method: "GET" });
        if (res.status === 401) {
          setState("expired");
        }
      } catch {
        // network error — don't show warning
      }
    }

    scheduleWarning();
    const timer = setInterval(checkSession, 5 * 60 * 1000);
    return () => {
      clearInterval(timer);
      clearTimeout(warningTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (state !== "ok") {
      btnRef.current?.focus();
    }
  }, [state]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Tab") {
      e.preventDefault();
      btnRef.current?.focus();
    }
    if (e.key === "Escape" && state === "expired") {
      window.location.href = "/hub/login";
    }
  }, [state]);

  async function extendSession() {
    try {
      const res = await fetch("/api/auth/customer/check", { method: "GET" });
      if (res.ok) {
        setState("ok");
      } else {
        setState("expired");
      }
    } catch {
      setState("expired");
    }
  }

  if (state === "ok") return null;

  if (state === "warning") {
    return (
      <div
        className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-96 bg-amber-50 border border-amber-300 rounded-card p-4 shadow-lg z-50"
        role="alert"
      >
        <div className="flex items-start gap-3">
          <svg className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="flex-1">
            <p className="text-sm font-medium text-amber-800">Session expiring soon</p>
            <p className="text-xs text-amber-700 mt-0.5">Your session will expire in about 5 minutes.</p>
            <div className="flex gap-2 mt-2">
              <button
                ref={btnRef}
                onClick={extendSession}
                className="px-3 py-1 text-xs font-medium text-white bg-amber-600 rounded hover:bg-amber-700 transition-colors"
              >
                Stay logged in
              </button>
              <button
                onClick={() => setState("ok")}
                className="px-3 py-1 text-xs font-medium text-amber-700 hover:underline"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="session-expired-title"
      aria-describedby="session-expired-desc"
      onKeyDown={handleKeyDown}
    >
      <div className="bg-white rounded-card p-6 shadow-xl max-w-sm mx-4">
        <h2 id="session-expired-title" className="text-lg font-bold text-esm-black mb-2">Session Expired</h2>
        <p id="session-expired-desc" className="text-sm text-esm-grey mb-4">
          Your session has expired. Please log in again to continue.
        </p>
        <button
          ref={btnRef}
          onClick={() => { window.location.href = "/hub/login"; }}
          className="w-full py-2 text-sm font-medium text-white bg-esm-red rounded hover:opacity-90 transition-opacity"
        >
          Log In
        </button>
      </div>
    </div>
  );
}
