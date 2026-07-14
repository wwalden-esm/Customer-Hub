"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import type { AuditEntry } from "@/lib/audit-log";

const categoryLabels: Record<string, string> = {
  auth: "Auth",
  user: "Users",
  config: "Config",
  notification: "Notifications",
  project: "Projects",
  question: "Questions",
};

const categoryColors: Record<string, string> = {
  auth: "bg-blue-50 text-blue-700",
  user: "bg-purple-50 text-purple-700",
  config: "bg-slate-100 text-slate-700",
  notification: "bg-amber-50 text-amber-700",
  project: "bg-emerald-50 text-emerald-700",
  question: "bg-cyan-50 text-cyan-700",
};

export default function AuditLogClient({ entries }: { entries: AuditEntry[] }) {
  const [filter, setFilter] = useState<string>("all");

  const categories = [...new Set(entries.map((e) => e.category))].sort();
  const filtered = filter === "all" ? entries : entries.filter((e) => e.category === filter);

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <button
          onClick={() => setFilter("all")}
          className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${
            filter === "all" ? "bg-esm-black text-white" : "bg-white text-esm-grey border border-esm-border hover:border-esm-black"
          }`}
        >
          All ({entries.length})
        </button>
        {categories.map((cat) => {
          const count = entries.filter((e) => e.category === cat).length;
          return (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${
                filter === cat ? "bg-esm-black text-white" : "bg-white text-esm-grey border border-esm-border hover:border-esm-black"
              }`}
            >
              {categoryLabels[cat] || cat} ({count})
            </button>
          );
        })}
      </div>

      {filtered.length === 0 ? (
        <Card padding="lg" className="text-center">
          <p className="text-sm text-esm-grey">No audit entries found.</p>
        </Card>
      ) : (
        <Card padding="sm" className="!p-0 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-esm-border bg-gray-50">
                <th className="text-left px-4 py-3 text-[10px] font-bold text-esm-grey uppercase tracking-wider w-40">Time</th>
                <th className="text-left px-4 py-3 text-[10px] font-bold text-esm-grey uppercase tracking-wider w-20">Type</th>
                <th className="text-left px-4 py-3 text-[10px] font-bold text-esm-grey uppercase tracking-wider w-36">Actor</th>
                <th className="text-left px-4 py-3 text-[10px] font-bold text-esm-grey uppercase tracking-wider">Action</th>
                <th className="text-left px-4 py-3 text-[10px] font-bold text-esm-grey uppercase tracking-wider">Target</th>
                <th className="text-left px-4 py-3 text-[10px] font-bold text-esm-grey uppercase tracking-wider hidden lg:table-cell">Detail</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((entry, i) => {
                const dt = new Date(entry.timestamp);
                const timeStr = dt.toLocaleDateString("en-US", { month: "short", day: "numeric" }) +
                  " " + dt.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
                return (
                  <tr key={i} className="border-b border-gray-100 last:border-0">
                    <td className="px-4 py-2.5 text-esm-muted text-xs">{timeStr}</td>
                    <td className="px-4 py-2.5">
                      <span className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full ${categoryColors[entry.category] || "bg-slate-100 text-slate-700"}`}>
                        {categoryLabels[entry.category] || entry.category}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-esm-grey truncate max-w-[140px]">{entry.actor}</td>
                    <td className="px-4 py-2.5 text-esm-black font-medium">{entry.action.replace(/_/g, " ")}</td>
                    <td className="px-4 py-2.5 text-esm-grey truncate max-w-[160px]">{entry.target}</td>
                    <td className="px-4 py-2.5 text-esm-muted text-xs hidden lg:table-cell truncate max-w-[200px]">{entry.detail || "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
