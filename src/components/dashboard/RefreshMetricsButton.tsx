"use client";

import { useState } from "react";

export default function RefreshMetricsButton({ projectId }: { projectId: string }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setLoading(true);
    setResult(null);
    setError(null);

    try {
      const res = await fetch(`/api/projects/${projectId}/metrics/refresh`, {
        method: "POST",
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to refresh metrics");
        return;
      }

      setResult(`Updated ${data.updated}, created ${data.created} metrics`);
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="inline-flex items-center gap-2">
      <button
        onClick={handleClick}
        disabled={loading}
        className="text-xs px-2 py-1 rounded border border-esm-border hover:bg-slate-50 disabled:opacity-50 transition-colors"
      >
        {loading ? "Refreshing..." : "Refresh Metrics"}
      </button>
      {result && <span className="text-xs text-green-600">{result}</span>}
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  );
}
