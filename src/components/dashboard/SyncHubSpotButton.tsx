"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";

interface SyncResult {
  created: Array<{ projectId: string; customerName: string }>;
  skipped: number;
}

export default function SyncHubSpotButton() {
  const [syncing, setSyncing] = useState(false);
  const [result, setResult] = useState<SyncResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSync() {
    setSyncing(true);
    setResult(null);
    setError(null);

    try {
      const res = await fetch("/api/admin/sync-hubspot", { method: "POST" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Sync failed");
      }
      const data: SyncResult = await res.json();
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sync failed");
    } finally {
      setSyncing(false);
    }
  }

  return (
    <div className="flex items-center gap-3">
      <Button
        onClick={handleSync}
        disabled={syncing}
        variant="primary"
        size="md"
      >
        {syncing ? (
          <>
            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Syncing...
          </>
        ) : (
          <>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Sync from HubSpot
          </>
        )}
      </Button>

      {result && result.created.length > 0 && (
        <span className="text-sm text-green-700">
          Created {result.created.length} project{result.created.length > 1 ? "s" : ""}:
          {" "}{result.created.map((c) => c.customerName).join(", ")}
        </span>
      )}
      {result && result.created.length === 0 && (
        <span className="text-sm text-slate-500">No new projects to create</span>
      )}
      {error && <span className="text-sm text-esm-red">{error}</span>}
    </div>
  );
}
