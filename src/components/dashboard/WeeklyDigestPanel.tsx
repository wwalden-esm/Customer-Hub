"use client";

import { useState } from "react";
import { Button, Card, SectionLabel, useToast } from "@/components/ui";

interface DigestSummary {
  sent: { projectId: string; email: string }[];
  skipped: string[];
  errors: { projectId: string; error: string }[];
}

export default function WeeklyDigestPanel() {
  const { toast } = useToast();
  const [sending, setSending] = useState(false);
  const [lastResult, setLastResult] = useState<DigestSummary | null>(null);

  async function triggerDigest() {
    setSending(true);
    setLastResult(null);
    try {
      const res = await fetch("/api/admin/weekly-digest", { method: "POST" });
      if (!res.ok) throw new Error();
      const data: DigestSummary = await res.json();
      setLastResult(data);
      toast(`Digest sent to ${data.sent.length} recipient${data.sent.length !== 1 ? "s" : ""}`, "success");
    } catch {
      toast("Failed to send weekly digest", "error");
    } finally {
      setSending(false);
    }
  }

  return (
    <Card className="mt-6">
      <SectionLabel className="mb-3">Weekly digest</SectionLabel>
      <p className="text-sm text-esm-grey dark:text-neutral-400 mb-4">
        Send a project status summary to all Solutions Consultants. Each SC receives a digest for their assigned projects.
      </p>
      <div className="flex items-center gap-3">
        <Button
          variant="primary"
          size="sm"
          onClick={triggerDigest}
          disabled={sending}
        >
          {sending ? "Sending..." : "Send digest now"}
        </Button>
        <p className="text-xs text-esm-muted">
          Sends to SCs with active projects
        </p>
      </div>
      {lastResult && (
        <div className="mt-4 p-3 bg-esm-grey-light dark:bg-neutral-800 rounded-card text-sm space-y-1">
          <p className="text-esm-black dark:text-neutral-100">
            <span className="font-medium text-emerald-600">{lastResult.sent.length}</span> sent
            {lastResult.skipped.length > 0 && (
              <>, <span className="font-medium text-esm-muted">{lastResult.skipped.length}</span> skipped</>
            )}
            {lastResult.errors.length > 0 && (
              <>, <span className="font-medium text-red-600">{lastResult.errors.length}</span> failed</>
            )}
          </p>
          {lastResult.errors.length > 0 && (
            <ul className="text-xs text-red-600 space-y-0.5">
              {lastResult.errors.map((e, i) => (
                <li key={i}>{e.projectId}: {e.error}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </Card>
  );
}
