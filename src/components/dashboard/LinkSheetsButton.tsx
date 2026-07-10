"use client";

import { useState } from "react";

interface LinkSheetsButtonProps {
  projectId: string;
  hasSheets: boolean;
}

export default function LinkSheetsButton({ projectId, hasSheets }: LinkSheetsButtonProps) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setLoading(true);
    setResult(null);
    setError(null);

    try {
      const res = await fetch(`/api/projects/${projectId}/link-sheets`, {
        method: "POST",
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to link sheets");
        return;
      }

      const sheetCount = Object.keys(data.linked).filter((k) => k !== "workspaceId").length;
      const infoNote = data.seededProjectInfo ? " + Project Info seeded" : "";
      setResult(`Linked ${sheetCount} sheets from "${data.workspaceName}"${infoNote}`);
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
        title={hasSheets ? "Re-link sheets from Smartsheet workspace" : "Link sheets from Smartsheet workspace"}
      >
        {loading ? "Linking..." : hasSheets ? "Re-link" : "Link Sheets"}
      </button>
      {result && <span className="text-xs text-green-600">{result}</span>}
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  );
}
