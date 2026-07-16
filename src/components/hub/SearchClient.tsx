"use client";

import { useState, useMemo } from "react";
import { Card } from "@/components/ui";

interface SearchItem {
  id: string;
  type: "milestone" | "action" | "meeting" | "raid" | "question" | "document";
  title: string;
  detail: string;
  href: string;
}

const TYPE_STYLES: Record<string, { label: string; bg: string; color: string }> = {
  milestone: { label: "Milestone", bg: "bg-emerald-100", color: "text-emerald-700" },
  action: { label: "Action Item", bg: "bg-amber-100", color: "text-amber-700" },
  meeting: { label: "Meeting", bg: "bg-blue-100", color: "text-blue-700" },
  raid: { label: "RAID", bg: "bg-purple-100", color: "text-purple-700" },
  question: { label: "Question", bg: "bg-rose-100", color: "text-rose-700" },
  document: { label: "Document", bg: "bg-cyan-100", color: "text-cyan-700" },
};

export default function SearchClient({ items }: { items: SearchItem[] }) {
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  const results = useMemo(() => {
    const q = query.toLowerCase().trim();
    return items.filter((item) => {
      if (typeFilter !== "all" && item.type !== typeFilter) return false;
      if (!q) return false;
      return item.title.toLowerCase().includes(q) || item.detail.toLowerCase().includes(q);
    });
  }, [items, query, typeFilter]);

  const types = ["all", "milestone", "action", "meeting", "raid", "question", "document"];

  return (
    <div>
      <div className="flex gap-3 mb-4">
        <div className="flex-1 relative">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-esm-muted"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search milestones, action items, meetings, RAID, questions, documents..."
            className="w-full text-sm border border-esm-border rounded-card pl-10 pr-4 py-2.5 focus:outline-none focus:border-esm-black"
            autoFocus
          />
        </div>
      </div>

      <div className="flex gap-2 mb-4">
        {types.map((t) => {
          const label = t === "all" ? "All" : TYPE_STYLES[t]?.label || t;
          return (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
                typeFilter === t
                  ? "bg-esm-black text-white"
                  : "bg-white text-esm-grey border border-esm-border hover:border-esm-black"
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>

      {!query.trim() ? (
        <Card padding="lg" className="!p-12 text-center">
          <svg className="w-12 h-12 mx-auto mb-3 text-esm-muted opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <p className="text-sm text-esm-grey">Type to search across {items.length} items</p>
          <p className="text-xs text-esm-muted mt-1">Milestones, action items, meetings, RAID log, questions, and documents</p>
        </Card>
      ) : results.length === 0 ? (
        <Card padding="lg" className="!p-8 text-center">
          <p className="text-sm text-esm-grey">No results for &ldquo;{query}&rdquo;</p>
        </Card>
      ) : (
        <div>
          <p className="text-xs text-esm-muted mb-3">{results.length} result{results.length !== 1 ? "s" : ""}</p>
          <Card padding="sm" className="!p-0 divide-y divide-gray-100 overflow-hidden">
            {results.slice(0, 50).map((item) => {
              const style = TYPE_STYLES[item.type] || TYPE_STYLES.raid;
              return (
                <a
                  key={item.id}
                  href={item.href}
                  className="flex items-start gap-3 px-5 py-3 hover:bg-gray-50 transition-colors no-underline"
                >
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 mt-0.5 ${style.bg} ${style.color}`}>
                    {style.label}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-esm-black">{item.title}</p>
                    <p className="text-xs text-esm-muted mt-0.5 truncate">{item.detail}</p>
                  </div>
                </a>
              );
            })}
          </Card>
          {results.length > 50 && (
            <p className="text-xs text-esm-muted text-center mt-3">Showing first 50 of {results.length} results</p>
          )}
        </div>
      )}
    </div>
  );
}
