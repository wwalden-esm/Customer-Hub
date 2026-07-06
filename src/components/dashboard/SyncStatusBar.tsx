"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface SyncStatusBarProps {
  dataTimestamp: string;
}

export default function SyncStatusBar({ dataTimestamp }: SyncStatusBarProps) {
  const router = useRouter();
  const [syncing, setSyncing] = useState(false);
  const [relativeTime, setRelativeTime] = useState("");

  useEffect(() => {
    function update() {
      const diff = Date.now() - new Date(dataTimestamp).getTime();
      const seconds = Math.floor(diff / 1000);
      if (seconds < 10) setRelativeTime("just now");
      else if (seconds < 60) setRelativeTime(`${seconds}s ago`);
      else if (seconds < 3600) setRelativeTime(`${Math.floor(seconds / 60)}m ago`);
      else setRelativeTime(`${Math.floor(seconds / 3600)}h ago`);
    }
    update();
    const id = setInterval(update, 10_000);
    return () => clearInterval(id);
  }, [dataTimestamp]);

  function handleSync() {
    setSyncing(true);
    router.refresh();
    setTimeout(() => setSyncing(false), 1500);
  }

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={handleSync}
        disabled={syncing}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-esm-grey border border-slate-300 rounded hover:bg-slate-50 disabled:opacity-50 transition-colors"
      >
        <svg
          className={`w-3.5 h-3.5 ${syncing ? "animate-spin" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
          />
        </svg>
        {syncing ? "Syncing..." : "Refresh"}
      </button>
      <div className="flex items-center gap-1.5 text-xs text-slate-500">
        <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500" />
        Synced {relativeTime}
      </div>
    </div>
  );
}
