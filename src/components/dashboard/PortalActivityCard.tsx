"use client";

import { useState, useEffect } from "react";
import { SectionLabel, Card } from "@/components/ui";

interface Visitor {
  email: string;
  name: string | null;
  lastSeen: string;
  pageViews: number;
}

interface ActivitySummary {
  totalVisits: number;
  uniqueVisitors: number;
  lastVisit: string | null;
  recentVisitors: Visitor[];
}

export default function PortalActivityCard({ projectId }: { projectId: string }) {
  const [data, setData] = useState<ActivitySummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/projects/${projectId}/activity`)
      .then((r) => r.ok ? r.json() : null)
      .then((d) => setData(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [projectId]);

  if (loading) {
    return (
      <Card padding="md">
        <SectionLabel className="mb-3">Portal Activity</SectionLabel>
        <p className="text-xs text-esm-grey">Loading...</p>
      </Card>
    );
  }

  if (!data || data.totalVisits === 0) {
    return (
      <Card padding="md">
        <SectionLabel className="mb-3">Portal Activity</SectionLabel>
        <p className="text-xs text-esm-grey">No customer portal visits recorded yet.</p>
      </Card>
    );
  }

  function timeAgo(iso: string): string {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days === 1) return "Yesterday";
    return `${days}d ago`;
  }

  return (
    <Card padding="md">
      <SectionLabel className="mb-3">Portal Activity</SectionLabel>
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="text-center">
          <div className="text-lg font-bold text-esm-black">{data.totalVisits}</div>
          <SectionLabel>Page views</SectionLabel>
        </div>
        <div className="text-center">
          <div className="text-lg font-bold text-esm-black">{data.uniqueVisitors}</div>
          <SectionLabel>Visitors</SectionLabel>
        </div>
        <div className="text-center">
          <div className="text-lg font-bold text-esm-black">{data.lastVisit ? timeAgo(data.lastVisit) : "—"}</div>
          <SectionLabel>Last visit</SectionLabel>
        </div>
      </div>
      {data.recentVisitors.length > 0 && (
        <div className="border-t border-gray-100 pt-3">
          <SectionLabel className="mb-2">Recent visitors</SectionLabel>
          <div className="space-y-2">
            {data.recentVisitors.slice(0, 5).map((v) => (
              <div key={v.email} className="flex items-center justify-between text-xs">
                <div className="min-w-0">
                  <span className="font-medium text-esm-black truncate block">{v.name || v.email}</span>
                  {v.name && <span className="text-esm-grey truncate block">{v.email}</span>}
                </div>
                <div className="text-right shrink-0 ml-2">
                  <span className="text-esm-grey">{v.pageViews} views</span>
                  <span className="text-slate-400 block">{timeAgo(v.lastSeen)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}
