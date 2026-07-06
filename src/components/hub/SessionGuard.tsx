"use client";

import { useEffect, useState } from "react";

export default function SessionGuard() {
  const [showWarning, setShowWarning] = useState(false);

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

  if (!showWarning) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-sm p-6 shadow-xl max-w-sm mx-4">
        <h2 className="text-lg font-bold text-esm-black mb-2">Session Expired</h2>
        <p className="text-sm text-esm-grey mb-4">
          Your session has expired. Please log in again to continue.
        </p>
        <button
          onClick={() => { window.location.href = "/hub/login"; }}
          className="w-full py-2 text-sm font-medium text-white bg-esm-red rounded hover:opacity-90 transition-opacity"
        >
          Log In
        </button>
      </div>
    </div>
  );
}
