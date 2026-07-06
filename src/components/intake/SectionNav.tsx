"use client";

import type { SectionKey, SectionStatus } from "@/types/enums";
import { PART_FOR_SECTION, PART_LABELS, SECTION_LABELS, SECTION_ORDER, WORKSHOP_SECTIONS } from "@/types";

interface Props {
  active: SectionKey;
  onSelect: (k: SectionKey) => void;
  statuses: Record<SectionKey, SectionStatus>;
}

const STATUS_BADGE: Record<SectionStatus, { label: string; className: string }> = {
  NOT_STARTED: { label: "Not started", className: "bg-slate-100 text-slate-500" },
  IN_PROGRESS: { label: "In progress", className: "bg-amber-100 text-amber-800" },
  IN_WORKSHOP: { label: "In workshop", className: "bg-blue-100 text-blue-800" },
  COMPLETE: { label: "Complete", className: "bg-emerald-100 text-emerald-800" },
};

export function SectionNav({ active, onSelect, statuses }: Props) {
  const grouped = (() => {
    const groups: Record<1 | 2 | 3 | 4, SectionKey[]> = { 1: [], 2: [], 3: [], 4: [] };
    for (const k of SECTION_ORDER) groups[PART_FOR_SECTION[k]].push(k);
    return groups;
  })();

  return (
    <nav className="w-80 bg-white border-r border-slate-200 p-4 overflow-y-auto max-h-screen sticky top-0">
      {([1, 2, 3, 4] as const).map((part) => (
        <div key={part} className="mb-5">
          <h3 className="text-xs uppercase tracking-wider text-slate-500 font-semibold mb-2">{PART_LABELS[part]}</h3>
          <ol className="space-y-1">
            {grouped[part].map((key) => {
              const status = statuses[key];
              const isActive = key === active;
              const badge = STATUS_BADGE[status];
              const isWorkshop = WORKSHOP_SECTIONS.has(key);
              return (
                <li key={key}>
                  <button
                    onClick={() => onSelect(key)}
                    className={`w-full text-left px-3 py-2 rounded ${
                      isActive ? "bg-red-50 border border-esm-red/30" : "hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-sm font-medium text-slate-800">
                        {SECTION_LABELS[key]}
                        {isWorkshop && <span className="ml-1 text-blue-600" title="Workshop section">⚑</span>}
                      </span>
                    </div>
                    <span className={`mt-1 inline-block text-xs px-2 py-0.5 rounded-full ${badge.className}`}>
                      {badge.label}
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
        </div>
      ))}
    </nav>
  );
}
