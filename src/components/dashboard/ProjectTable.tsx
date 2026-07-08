"use client";

import { useState, useMemo, useCallback } from "react";
import Link from "next/link";
import LinkSheetsButton from "./LinkSheetsButton";
import { parseLocalDate } from "@/lib/date-utils";

interface ProjectRow {
  id: string;
  customerName: string;
  projectName: string;
  scName: string;
  pmName?: string;
  goLiveDate?: string | null;
  status: string;
  currentPhase: string;
  hasSheets: boolean;
  daysToGoLive?: number | null;
}

const STATUS_BADGE: Record<string, { bg: string; text: string; label: string }> = {
  ON_TRACK: { bg: "bg-emerald-100", text: "text-emerald-800", label: "On Track" },
  AT_RISK: { bg: "bg-amber-100", text: "text-amber-800", label: "At Risk" },
  OFF_TRACK: { bg: "bg-red-100", text: "text-red-800", label: "Off Track" },
};

function fmtDate(d: string | null | undefined): string {
  if (!d) return "—";
  return parseLocalDate(d).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

type SortKey = "customerName" | "scName" | "goLiveDate" | "status" | "currentPhase";

export default function ProjectTable({ projects }: { projects: ProjectRow[] }) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortKey, setSortKey] = useState<SortKey>("customerName");
  const [sortAsc, setSortAsc] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkAction, setBulkAction] = useState<string | null>(null);
  const [bulkProgress, setBulkProgress] = useState<{ done: number; total: number } | null>(null);
  const [bulkResult, setBulkResult] = useState<string | null>(null);

  const filtered = useMemo(() => {
    let list = projects;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (p) =>
          p.customerName.toLowerCase().includes(q) ||
          p.projectName.toLowerCase().includes(q) ||
          p.scName.toLowerCase().includes(q)
      );
    }
    if (statusFilter !== "all") {
      list = list.filter((p) => p.status === statusFilter);
    }
    list = [...list].sort((a, b) => {
      const av = (a[sortKey] ?? "") as string;
      const bv = (b[sortKey] ?? "") as string;
      const cmp = av.localeCompare(bv);
      return sortAsc ? cmp : -cmp;
    });
    return list;
  }, [projects, search, statusFilter, sortKey, sortAsc]);

  const filteredIds = useMemo(() => new Set(filtered.map((p) => p.id)), [filtered]);
  const allVisibleSelected = filtered.length > 0 && filtered.every((p) => selected.has(p.id));

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      setSortAsc(true);
    }
  }

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (allVisibleSelected) {
      setSelected((prev) => {
        const next = new Set(prev);
        for (const p of filtered) next.delete(p.id);
        return next;
      });
    } else {
      setSelected((prev) => {
        const next = new Set(prev);
        for (const p of filtered) next.add(p.id);
        return next;
      });
    }
  }

  const runBulk = useCallback(async (action: "link-sheets" | "refresh-metrics") => {
    const ids = Array.from(selected).filter((id) => filteredIds.has(id));
    if (ids.length === 0) return;

    setBulkAction(action);
    setBulkProgress({ done: 0, total: ids.length });
    setBulkResult(null);

    let successes = 0;
    let failures = 0;

    for (let i = 0; i < ids.length; i++) {
      try {
        const endpoint = action === "link-sheets"
          ? `/api/projects/${ids[i]}/link-sheets`
          : `/api/projects/${ids[i]}/metrics/refresh`;
        const res = await fetch(endpoint, { method: "POST" });
        if (res.ok) successes++;
        else failures++;
      } catch {
        failures++;
      }
      setBulkProgress({ done: i + 1, total: ids.length });
    }

    const label = action === "link-sheets" ? "Link Sheets" : "Refresh Metrics";
    const parts = [];
    if (successes) parts.push(`${successes} succeeded`);
    if (failures) parts.push(`${failures} failed`);
    setBulkResult(`${label}: ${parts.join(", ")}`);
    setBulkAction(null);
    setBulkProgress(null);
  }, [selected, filteredIds]);

  const selectedCount = Array.from(selected).filter((id) => filteredIds.has(id)).length;

  function SortHeader({ label, k }: { label: string; k: SortKey }) {
    const active = sortKey === k;
    return (
      <th
        className="px-4 py-3 font-medium cursor-pointer select-none hover:text-esm-black"
        onClick={() => toggleSort(k)}
      >
        {label}
        {active && <span className="ml-1 text-[10px]">{sortAsc ? "▲" : "▼"}</span>}
      </th>
    );
  }

  return (
    <>
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-sm">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search projects..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border border-[#E2E0E1] rounded"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border border-[#E2E0E1] rounded px-3 py-2 text-sm text-esm-black"
        >
          <option value="all">All statuses</option>
          <option value="ON_TRACK">On Track</option>
          <option value="AT_RISK">At Risk</option>
          <option value="OFF_TRACK">Off Track</option>
        </select>
      </div>

      {/* Bulk action toolbar */}
      {selectedCount > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded px-4 py-2.5 mb-3 flex items-center gap-4 text-sm">
          <span className="font-medium text-blue-800">{selectedCount} project{selectedCount > 1 ? "s" : ""} selected</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => runBulk("link-sheets")}
              disabled={!!bulkAction}
              className="px-3 py-1 text-xs font-medium text-white bg-esm-red rounded hover:bg-esm-red/90 disabled:opacity-50"
            >
              {bulkAction === "link-sheets" ? `Linking ${bulkProgress?.done}/${bulkProgress?.total}...` : "Link Sheets"}
            </button>
            <button
              onClick={() => runBulk("refresh-metrics")}
              disabled={!!bulkAction}
              className="px-3 py-1 text-xs font-medium text-white bg-esm-red rounded hover:bg-esm-red/90 disabled:opacity-50"
            >
              {bulkAction === "refresh-metrics" ? `Refreshing ${bulkProgress?.done}/${bulkProgress?.total}...` : "Refresh Metrics"}
            </button>
          </div>
          <button
            onClick={() => setSelected(new Set())}
            className="text-xs text-blue-600 hover:text-blue-800 ml-auto"
          >
            Clear selection
          </button>
        </div>
      )}

      {bulkResult && (
        <div className="bg-emerald-50 border border-emerald-200 rounded px-4 py-2 mb-3 flex items-center justify-between text-sm text-emerald-700">
          {bulkResult}
          <button onClick={() => setBulkResult(null)} className="text-xs text-emerald-600 hover:text-emerald-800">
            Dismiss
          </button>
        </div>
      )}

      <div className="bg-white rounded-sm border border-[#E2E0E1] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-esm-grey">
              <tr>
                <th className="px-4 py-3 w-10">
                  <input
                    type="checkbox"
                    checked={allVisibleSelected}
                    onChange={toggleAll}
                    className="w-4 h-4 rounded border-slate-300 text-esm-red focus:ring-esm-red"
                    aria-label="Select all projects"
                  />
                </th>
                <SortHeader label="Customer" k="customerName" />
                <SortHeader label="SC" k="scName" />
                <th className="px-4 py-3 font-medium">PM</th>
                <SortHeader label="Go-Live" k="goLiveDate" />
                <SortHeader label="Status" k="status" />
                <SortHeader label="Phase" k="currentPhase" />
                <th className="px-4 py-3 font-medium">Sheets</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-esm-grey">
                    {projects.length === 0 ? "No projects configured." : "No projects match your search."}
                  </td>
                </tr>
              )}
              {filtered.map((p) => {
                const badge = STATUS_BADGE[p.status] || STATUS_BADGE.ON_TRACK;
                const isSelected = selected.has(p.id);
                return (
                  <tr key={p.id} className={`hover:bg-gray-50 ${isSelected ? "bg-blue-50/50" : ""}`}>
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleOne(p.id)}
                        className="w-4 h-4 rounded border-slate-300 text-esm-red focus:ring-esm-red"
                        aria-label={`Select ${p.customerName}`}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/dashboard/${p.id}`} className="text-esm-blue hover:underline font-medium">
                        {p.customerName}
                      </Link>
                      <div className="text-xs text-esm-grey">{p.projectName}</div>
                    </td>
                    <td className="px-4 py-3">{p.scName}</td>
                    <td className="px-4 py-3">{p.pmName || "—"}</td>
                    <td className="px-4 py-3">
                      <span>{fmtDate(p.goLiveDate)}</span>
                      {p.daysToGoLive != null && (
                        <span className={`block text-[10px] font-medium ${
                          p.daysToGoLive <= 30 ? "text-red-600" : p.daysToGoLive <= 60 ? "text-amber-600" : "text-emerald-600"
                        }`}>
                          {p.daysToGoLive > 0 ? `${p.daysToGoLive}d remaining` : p.daysToGoLive === 0 ? "Today" : `${Math.abs(p.daysToGoLive)}d overdue`}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2 py-0.5 text-xs rounded-full ${badge.bg} ${badge.text}`}>
                        {badge.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 capitalize">{p.currentPhase}</td>
                    <td className="px-4 py-3">
                      <LinkSheetsButton projectId={p.id} hasSheets={p.hasSheets} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
