"use client";

import type { SectionKey, SectionStatus } from "@/types/enums";
import { PART_FOR_SECTION, PART_LABELS, SECTION_LABELS, SECTION_ORDER, WORKSHOP_SECTIONS } from "@/types";
import { Badge, type BadgeVariant } from "@/components/ui";

interface Props {
  active: SectionKey;
  onSelect: (k: SectionKey) => void;
  statuses: Record<SectionKey, SectionStatus>;
}

const STATUS_BADGE: Record<SectionStatus, { label: string; variant: BadgeVariant }> = {
  NOT_STARTED: { label: "Not started", variant: "neutral" },
  IN_PROGRESS: { label: "In progress", variant: "warning" },
  IN_WORKSHOP: { label: "In workshop", variant: "info" },
  COMPLETE: { label: "Complete", variant: "success" },
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
                    <Badge variant={badge.variant} pill className="mt-1 text-xs">
                      {badge.label}
                    </Badge>
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
