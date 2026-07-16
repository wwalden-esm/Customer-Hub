"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, Button, Badge } from "@/components/ui";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { useToast } from "@/components/ui/Toast";

interface WorkflowReviewCardProps {
  projectId: string;
}

export default function WorkflowReviewCard({ projectId }: WorkflowReviewCardProps) {
  const { toast } = useToast();
  const [status, setStatus] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [reviewNotes, setReviewNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);

  useEffect(() => {
    fetch(`/api/projects/${projectId}/workflow-review`)
      .then((r) => r.json())
      .then((data) => {
        setStatus(data.review_status ?? null);
        setReviewNotes(data.review_notes ?? "");
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [projectId]);

  const handleAction = useCallback(async (action: "approve" | "request_changes") => {
    setActing(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/workflow-review`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, notes: notes || undefined }),
      });
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      setStatus(data.review_status);
      setNotes("");
      toast(action === "approve" ? "Workflow approved" : "Changes requested", "success");
    } catch {
      toast("Failed to update review", "error");
    } finally {
      setActing(false);
    }
  }, [projectId, notes, toast]);

  if (loading || !status || status === "draft") return null;

  return (
    <Card padding="md">
      <div className="flex items-center justify-between mb-3">
        <SectionLabel>Workflow Review</SectionLabel>
        <Badge
          variant={
            status === "approved" ? "success" :
            status === "submitted" ? "info" :
            status === "changes_requested" ? "warning" :
            "neutral"
          }
          pill
        >
          {status === "approved" ? "Approved" :
           status === "submitted" ? "Pending Review" :
           status === "changes_requested" ? "Changes Requested" :
           status}
        </Badge>
      </div>

      {status === "submitted" && (
        <div className="space-y-3">
          <p className="text-sm text-esm-grey">
            Customer has submitted their workflow configuration for review.
          </p>
          <textarea
            className="w-full text-sm border border-esm-border rounded-card px-3 py-2 focus:outline-none focus:ring-2 focus:ring-esm-blue/30"
            rows={2}
            placeholder="Review notes (optional)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
          <div className="flex gap-2">
            <Button
              variant="primary"
              size="sm"
              onClick={() => handleAction("approve")}
              disabled={acting}
            >
              Approve
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => handleAction("request_changes")}
              disabled={acting}
            >
              Request Changes
            </Button>
          </div>
        </div>
      )}

      {status === "approved" && (
        <p className="text-sm text-esm-grey">
          Workflow has been approved. Customer can generate documents.
        </p>
      )}

      {status === "changes_requested" && reviewNotes && (
        <p className="text-sm text-esm-grey">
          Notes: {reviewNotes}
        </p>
      )}
    </Card>
  );
}
