"use client";

import { useEffect, useState, useRef, useCallback } from "react";

export default function SessionGuard() {
  const [showWarning, setShowWarning] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    async function checkSession() {
      try {
        const res = await fetch("/api/auth/customer/check", { method: "GET" });
        if (res.status === 401) {
          setShowWarning(true);
        }
      } catch {
        // network error — don't show warning
      }
    }

    const timer = setInterval(checkSession, 5 * 60 * 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (showWarning) {
      btnRef.current?.focus();
    }
  }, [showWarning]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Tab") {
      e.preventDefault();
      btnRef.current?.focus();
    }
    if (e.key === "Escape") {
      window.location.href = "/hub/login";
    }
  }, []);

  if (!showWarning) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="session-expired-title"
      aria-describedby="session-expired-desc"
      onKeyDown={handleKeyDown}
    >
      <div className="bg-white rounded-sm p-6 shadow-xl max-w-sm mx-4">
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
