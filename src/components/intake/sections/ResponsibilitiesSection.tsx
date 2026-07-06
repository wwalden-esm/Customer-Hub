"use client";

import { useMemo } from "react";
import type { ResponsibilitiesData, ResponsibilityAssignment } from "@/types";
import { RESPONSIBILITIES_DEFAULT } from "@/types";
import { SectionIntro } from "../primitives";

interface Props {
  data: Record<string, unknown>;
  onChange: (d: Record<string, unknown>) => void;
}

export function ResponsibilitiesSection({ data, onChange }: Props) {
  const d = data as ResponsibilitiesData;
  const assignments = useMemo<ResponsibilityAssignment[]>(() => {
    const existing = d.assignments ?? [];
    return RESPONSIBILITIES_DEFAULT.map((def) => {
      const match = existing.find((a) => a.responsibility === def.responsibility);
      return match ?? def;
    });
  }, [d.assignments]);

  const setRow = (idx: number, patch: Partial<ResponsibilityAssignment>) => {
    const next = assignments.map((a, i) => (i === idx ? { ...a, ...patch } : a));
    onChange({ ...d, assignments: next } as unknown as Record<string, unknown>);
  };

  return (
    <div className="space-y-4">
      <SectionIntro>
        Standard customer responsibilities for an ESM implementation. Please assign an owner for each.
      </SectionIntro>
      <div className="overflow-x-auto">
        <table className="w-full text-sm border border-slate-200 rounded">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-3 py-2 text-left text-slate-600 font-medium border-b">Responsibility</th>
              <th className="px-3 py-2 text-left text-slate-600 font-medium border-b w-56">Owner (Name)</th>
              <th className="px-3 py-2 text-left text-slate-600 font-medium border-b w-56">Notes</th>
            </tr>
          </thead>
          <tbody>
            {assignments.map((a, idx) => (
              <tr key={a.responsibility} className="border-b border-slate-100">
                <td className="px-3 py-2 text-slate-700">{a.responsibility}</td>
                <td className="px-1 py-1">
                  <input
                    className="w-full rounded border border-slate-200 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-esm-red/40"
                    value={a.owner ?? ""}
                    onChange={(e) => setRow(idx, { owner: e.target.value })}
                  />
                </td>
                <td className="px-1 py-1">
                  <input
                    className="w-full rounded border border-slate-200 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-esm-red/40"
                    value={a.notes ?? ""}
                    onChange={(e) => setRow(idx, { notes: e.target.value })}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
