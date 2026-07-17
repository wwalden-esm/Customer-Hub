"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, Badge, Button } from "@/components/ui";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { useToast } from "@/components/ui/Toast";

interface PendingItem {
  id: string;
  type: string;
  item: string;
  notes: string;
  priority: string;
  assigned: string;
  submittedBy: string;
  submittedAt: string;
  review_status: string;
}

const TYPE_VARIANTS: Record<string, "warning" | "info" | "danger" | "accent"> = {
  Risk: "warning",
  Action: "info",
  Issue: "danger",
  Decision: "accent",
};

interface RaidReviewCardProps {
  projectId: string;
}

export default function RaidReviewCard({ projectId }: RaidReviewCardProps) {
  const { toast } = useToast();
  const [items, setItems] = useState<PendingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});

  const fetchItems = useCallback(async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}/raid-review`);
      const data = await res.json();
      setItems(data.items ?? []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const handleAction = useCallback(async (itemId: string, action: "approve" | "request_changes") => {
    setActing(itemId);
    try {
      const res = await fetch(`/api/projects/${projectId}/raid-review`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId, action, notes: reviewNotes[itemId] || "" }),
      });
      if (!res.ok) throw new Error("Failed");
      toast(action === "approve" ? "RAID item approved and added to Smartsheet" : "Changes requested", "success");
      fetchItems();
    } catch {
      toast("Failed to update review", "error");
    } finally {
      setActing(null);
    }
  }, [projectId, reviewNotes, toast, fetchItems]);

  if (loading || items.length === 0) return null;

  const pending = items.filter((i) => i.review_status === "submitted");
  if (pending.length === 0) return null;

  return (
    <Card padding="md">
      <div className="flex items-center justify-between mb-3">
        <SectionLabel>RAID Submissions</SectionLabel>
        <Badge variant="warning" pill>
          {pending.length} pending
        </Badge>
      </div>

      <div className="space-y-4">
        {pending.map((pi) => (
          <div key={pi.id} className="border border-esm-border rounded-card p-3">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <Badge variant={TYPE_VARIANTS[pi.type] ?? "neutral"} pill>{pi.type}</Badge>
              <Badge variant="neutral" pill>{pi.priority}</Badge>
              <span className="text-[10px] text-esm-grey ml-auto">
                by {pi.submittedBy} &middot; {new Date(pi.submittedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              </span>
            </div>
            <p className="text-sm font-medium text-esm-black">{pi.item}</p>
            {pi.notes && <p className="text-xs text-esm-grey mt-0.5">{pi.notes}</p>}
            {pi.assigned && <p className="text-xs text-esm-grey mt-0.5">Suggested owner: {pi.assigned}</p>}

            <textarea
              className="w-full mt-2 text-sm border border-esm-border rounded-card px-3 py-2 focus:outline-none focus:ring-2 focus:ring-esm-blue/30"
              rows={1}
              placeholder="Review notes (optional)"
              value={reviewNotes[pi.id] || ""}
              onChange={(e) => setReviewNotes((prev) => ({ ...prev, [pi.id]: e.target.value }))}
            />

            <div className="flex gap-2 mt-2">
              <Button
                variant="primary"
                size="sm"
                onClick={() => handleAction(pi.id, "approve")}
                disabled={acting === pi.id}
              >
                {acting === pi.id ? "..." : "Approve"}
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => handleAction(pi.id, "request_changes")}
                disabled={acting === pi.id}
              >
                Request Changes
              </Button>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
