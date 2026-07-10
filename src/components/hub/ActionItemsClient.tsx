"use client";

import { useState } from "react";
import { parseLocalDate } from "@/lib/date-utils";
import { Badge, Card } from "@/components/ui";
import type { BadgeVariant } from "@/components/ui";

interface ActionItem {
  id: string;
  description: string;
  owner?: string;
  dueDate?: string;
  priority: string;
  status: string;
}

type Filter = "all" | "open" | "overdue" | "complete";

export default function ActionItemsClient({
  items: initialItems,
  projectId,
}: {
  items: ActionItem[];
  projectId: string;
}) {
  const [items, setItems] = useState(initialItems);
  const [filter, setFilter] = useState<Filter>("open");
  const [updating, setUpdating] = useState<Set<string>>(new Set());

  const now = new Date();
  now.setHours(0, 0, 0, 0);

  function isOverdue(item: ActionItem): boolean {
    if (!item.dueDate) return false;
    const s = item.status.toLowerCase();
    if (s === "complete" || s === "done") return false;
    return parseLocalDate(item.dueDate).getTime() < now.getTime();
  }

  function isOpen(item: ActionItem): boolean {
    const s = item.status.toLowerCase();
    return s !== "complete" && s !== "done";
  }

  const filtered = items.filter((item) => {
    if (filter === "all") return true;
    if (filter === "open") return isOpen(item);
    if (filter === "overdue") return isOverdue(item);
    if (filter === "complete") return !isOpen(item);
    return true;
  });

  const counts = {
    all: items.length,
    open: items.filter(isOpen).length,
    overdue: items.filter(isOverdue).length,
    complete: items.filter((i) => !isOpen(i)).length,
  };

  async function updateStatus(itemId: string, status: string) {
    setUpdating((s) => new Set(s).add(itemId));
    try {
      const res = await fetch(`/api/projects/${projectId}/action-items/${itemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error();
      setItems((prev) =>
        prev.map((i) => (i.id === itemId ? { ...i, status } : i)),
      );
    } catch {
      // silently fail — item stays in previous state
    } finally {
      setUpdating((s) => {
        const next = new Set(s);
        next.delete(itemId);
        return next;
      });
    }
  }

  function priorityVariant(p: string): BadgeVariant {
    const pl = p.toLowerCase();
    if (pl === "high" || pl === "critical") return "danger";
    if (pl === "medium" || pl === "med") return "warning";
    return "neutral";
  }

  function formatDate(d?: string): string {
    if (!d) return "—";
    return parseLocalDate(d).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  const FILTERS: { key: Filter; label: string }[] = [
    { key: "open", label: "Open" },
    { key: "overdue", label: "Overdue" },
    { key: "complete", label: "Complete" },
    { key: "all", label: "All" },
  ];

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
              filter === f.key
                ? "bg-esm-black text-white"
                : "bg-white text-esm-grey border border-esm-border hover:border-esm-black"
            }`}
          >
            {f.label}
            <span className="ml-1.5 opacity-60">{counts[f.key]}</span>
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <Card padding="lg" className="!p-8 text-center">
          <p className="text-sm text-esm-grey">
            {filter === "overdue"
              ? "No overdue items — nice work!"
              : filter === "complete"
                ? "No completed items yet."
                : "No action items found."}
          </p>
        </Card>
      ) : (
        <Card padding="sm" className="!p-0 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-esm-border bg-gray-50">
                <th className="text-left px-4 py-3 text-[10px] font-bold text-esm-grey uppercase tracking-wider">
                  Description
                </th>
                <th className="text-left px-4 py-3 text-[10px] font-bold text-esm-grey uppercase tracking-wider w-32">
                  Owner
                </th>
                <th className="text-left px-4 py-3 text-[10px] font-bold text-esm-grey uppercase tracking-wider w-28">
                  Due Date
                </th>
                <th className="text-left px-4 py-3 text-[10px] font-bold text-esm-grey uppercase tracking-wider w-20">
                  Priority
                </th>
                <th className="text-left px-4 py-3 text-[10px] font-bold text-esm-grey uppercase tracking-wider w-36">
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => {
                const overdue = isOverdue(item);
                const open = isOpen(item);
                const busy = updating.has(item.id);

                return (
                  <tr
                    key={item.id}
                    className={`border-b border-gray-100 last:border-0 ${overdue ? "bg-red-50/50" : ""}`}
                  >
                    <td className="px-4 py-3">
                      <span className={open ? "text-esm-black" : "text-esm-grey line-through"}>
                        {item.description}
                      </span>
                      {overdue && (
                        <Badge variant="danger" className="ml-2 text-[10px]">
                          Overdue
                        </Badge>
                      )}
                    </td>
                    <td className="px-4 py-3 text-esm-grey">{item.owner || "—"}</td>
                    <td className="px-4 py-3 text-esm-grey">
                      <span className={overdue ? "text-red-600 font-medium" : ""}>
                        {formatDate(item.dueDate)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={priorityVariant(item.priority)} pill className="text-[10px]">
                        {item.priority}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      {open ? (
                        <select
                          value={item.status.toLowerCase()}
                          disabled={busy}
                          onChange={(e) => updateStatus(item.id, e.target.value)}
                          className={`text-xs border border-esm-border rounded px-2 py-1 bg-white focus:outline-none focus:border-esm-black ${busy ? "opacity-50" : ""}`}
                        >
                          <option value="open">Open</option>
                          <option value="in-progress">In Progress</option>
                          <option value="complete">Complete</option>
                        </select>
                      ) : (
                        <Badge variant="success" pill className="text-[10px]">
                          Complete
                        </Badge>
                      )}
                    </td>
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
