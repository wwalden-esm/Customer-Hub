"use client";

import { useState, useMemo } from "react";
import { parseLocalDate } from "@/lib/date-utils";

interface RaidItem {
  id: string;
  itemId: string;
  item: string;
  type: "Risk" | "Action" | "Issue" | "Decision";
  status: "New" | "In Progress" | "Blocked" | "Complete";
  priority: "High" | "Medium" | "Low";
  notes: string;
  assigned: string;
  targetDate: string | null;
}

const TYPE_COLORS: Record<string, string> = {
  Risk: "bg-amber-100 text-amber-800",
  Action: "bg-blue-100 text-blue-800",
  Issue: "bg-red-100 text-red-800",
  Decision: "bg-purple-100 text-purple-800",
};

const STATUS_COLORS: Record<string, string> = {
  New: "bg-slate-100 text-slate-700",
  "In Progress": "bg-blue-100 text-blue-700",
  Blocked: "bg-red-100 text-red-700",
  Complete: "bg-green-100 text-green-700",
};

const PRIORITY_COLORS: Record<string, string> = {
  High: "bg-red-50 text-red-700 border border-red-200",
  Medium: "bg-amber-50 text-amber-700 border border-amber-200",
  Low: "bg-slate-50 text-esm-grey border border-[#E2E0E1]",
};

const TYPES = ["All", "Risk", "Action", "Issue", "Decision"] as const;
const STATUSES = ["All", "New", "In Progress", "Blocked", "Complete"] as const;

export default function RaidLogClient({ items }: { items: RaidItem[] }) {
  const [typeFilter, setTypeFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const filtered = useMemo(() => {
    return items.filter((item) => {
      if (typeFilter !== "All" && item.type !== typeFilter) return false;
      if (statusFilter !== "All" && item.status !== statusFilter) return false;
      return true;
    });
  }, [items, typeFilter, statusFilter]);

  const counts = useMemo(() => {
    const c = { Risk: 0, Action: 0, Issue: 0, Decision: 0, open: 0 };
    for (const item of items) {
      c[item.type]++;
      if (item.status !== "Complete") c.open++;
    }
    return c;
  }, [items]);

  const toggle = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  if (items.length === 0) {
    return (
      <div className="bg-white rounded-sm border border-[#E2E0E1] px-6 py-8 text-center">
        <svg className="w-10 h-10 mx-auto text-slate-300 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z" />
        </svg>
        <p className="text-sm text-slate-500">No RAID log items yet.</p>
        <p className="text-xs text-[#9E9B9E] mt-1">Risks, actions, issues, and decisions will appear here as they are logged.</p>
      </div>
    );
  }

  return (
    <>
      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-5" role="group" aria-label="RAID log summary">
        <div className="bg-white rounded-sm border border-[#E2E0E1] px-4 py-3 text-center">
          <p className="text-2xl font-semibold text-esm-black">{counts.open}</p>
          <p className="text-xs text-esm-grey">Open</p>
        </div>
        {(["Risk", "Action", "Issue", "Decision"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTypeFilter(typeFilter === t ? "All" : t)}
            aria-pressed={typeFilter === t}
            className={`rounded-sm border px-4 py-3 text-center transition-colors ${
              typeFilter === t ? "border-[var(--hub-accent)] bg-red-50" : "border-[#E2E0E1] bg-white hover:border-slate-300"
            }`}
            style={typeFilter === t ? { borderColor: "var(--hub-accent)" } : undefined}
          >
            <p className="text-2xl font-semibold text-esm-black">{counts[t]}</p>
            <p className="text-xs text-esm-grey">{counts[t] === 1 ? t : `${t}s`}</p>
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 mb-4" role="group" aria-label="Filters">
        <fieldset className="flex items-center gap-2">
          <legend className="text-[10px] font-extrabold text-esm-grey tracking-[0.09em] uppercase">Type</legend>
          <div className="flex gap-1" role="radiogroup" aria-label="Filter by type">
            {TYPES.map((t) => (
              <button
                key={t}
                onClick={() => setTypeFilter(t)}
                aria-pressed={typeFilter === t}
                className={`px-2.5 py-1 text-xs font-medium rounded-full transition-colors ${
                  typeFilter === t
                    ? "bg-esm-black text-white"
                    : "bg-gray-100 text-esm-grey hover:bg-gray-200"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </fieldset>
        <fieldset className="flex items-center gap-2">
          <legend className="text-[10px] font-extrabold text-esm-grey tracking-[0.09em] uppercase">Status</legend>
          <div className="flex gap-1" role="radiogroup" aria-label="Filter by status">
            {STATUSES.map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                aria-pressed={statusFilter === s}
                className={`px-2.5 py-1 text-xs font-medium rounded-full transition-colors ${
                  statusFilter === s
                    ? "bg-esm-black text-white"
                    : "bg-gray-100 text-esm-grey hover:bg-gray-200"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </fieldset>
      </div>

      {/* Items list */}
      <div className="bg-white rounded-sm border border-[#E2E0E1] divide-y divide-[#E2E0E1]">
        {filtered.length === 0 ? (
          <div className="px-5 py-6 text-center text-sm text-slate-500">
            No items match the selected filters.
          </div>
        ) : (
          filtered.map((item) => {
            const isExpanded = expanded.has(item.id);
            const isOverdue = item.targetDate && item.status !== "Complete"
              && parseLocalDate(item.targetDate) < new Date();
            const contentId = `raid-detail-${item.id}`;

            return (
              <div key={item.id} className="px-5 py-4">
                <button
                  onClick={() => toggle(item.id)}
                  aria-expanded={isExpanded}
                  aria-controls={item.notes ? contentId : undefined}
                  className="w-full text-left flex items-start gap-3"
                >
                  <svg
                    className={`w-4 h-4 text-[#9E9B9E] mt-0.5 shrink-0 transition-transform ${isExpanded ? "rotate-90" : ""}`}
                    fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${TYPE_COLORS[item.type]}`}>
                        {item.type}
                      </span>
                      <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${STATUS_COLORS[item.status]}`}>
                        {item.status}
                      </span>
                      <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${PRIORITY_COLORS[item.priority]}`}>
                        {item.priority}
                      </span>
                      {isOverdue && (
                        <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-red-100 text-red-700">
                          Overdue
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-medium text-esm-black mt-1.5">{item.item}</p>
                    <div className="flex gap-4 mt-1 text-xs text-esm-grey">
                      {item.assigned && <span>Assigned: {item.assigned}</span>}
                      {item.targetDate && (
                        <span className={isOverdue ? "text-red-600 font-medium" : ""}>
                          Due: {parseLocalDate(item.targetDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                        </span>
                      )}
                      {item.itemId && <span>ID: {item.itemId}</span>}
                    </div>
                  </div>
                </button>
                {isExpanded && item.notes && (
                  <div id={contentId} className="ml-7 mt-3 pl-4 border-l-2 border-[#E2E0E1]">
                    <p className="text-[10px] font-extrabold text-esm-grey tracking-[0.09em] uppercase mb-1">Notes</p>
                    <p className="text-sm text-esm-black whitespace-pre-wrap">{item.notes}</p>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      <p className="text-xs text-[#9E9B9E] mt-3" aria-live="polite">
        Showing {filtered.length} of {items.length} items
      </p>
    </>
  );
}
