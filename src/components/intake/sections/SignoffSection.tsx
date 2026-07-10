"use client";

import { useMemo } from "react";
import type { SignoffData, SignoffRow } from "@/types";
import { SIGNOFF_ROLES } from "@/types";
import { SectionIntro } from "../primitives";

interface Props {
  data: Record<string, unknown>;
  onChange: (d: Record<string, unknown>) => void;
}

export function SignoffSection({ data, onChange }: Props) {
  const d = data as SignoffData;
  const rows = useMemo<SignoffRow[]>(() => {
    const existing = d.rows ?? [];
    return SIGNOFF_ROLES.map((role) => {
      const match = existing.find((r) => r.role === role);
      return match ?? { role, name: "", date: "", confirmed: false };
    });
  }, [d.rows]);

  const setRow = (idx: number, patch: Partial<SignoffRow>) => {
    const next = rows.map((r, i) => (i === idx ? { ...r, ...patch } : r));
    onChange({ rows: next } as unknown as Record<string, unknown>);
  };

  return (
    <div className="space-y-4">
      <SectionIntro>
        By confirming below, the customer signers attest this Customer Intake accurately reflects the project framing
        and current-state information. ESM will use this as the foundation for the Solution Design & Configuration
        document. This typed confirmation is for ESM record-keeping; if your institution requires wet or DocuSign
        signatures, export this intake and route it separately.
      </SectionIntro>

      <div className="overflow-x-auto">
        <table className="w-full text-sm border border-slate-200 rounded">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-3 py-2 text-left text-slate-600 font-medium border-b">Role</th>
              <th className="px-3 py-2 text-left text-slate-600 font-medium border-b">Name</th>
              <th className="px-3 py-2 text-left text-slate-600 font-medium border-b w-40">Date</th>
              <th className="px-3 py-2 text-left text-slate-600 font-medium border-b w-32">Confirmation</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.role} className="border-b border-slate-100">
                <td className="px-3 py-2 text-slate-700">{r.role}</td>
                <td className="px-1 py-1">
                  <input
                    className="w-full rounded border border-slate-200 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-esm-red/40"
                    value={r.name ?? ""}
                    onChange={(e) => setRow(i, { name: e.target.value })}
                  />
                </td>
                <td className="px-1 py-1">
                  <input
                    type="date"
                    className="w-full rounded border border-slate-200 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-esm-red/40"
                    value={r.date ?? ""}
                    onChange={(e) => setRow(i, { date: e.target.value })}
                  />
                </td>
                <td className="px-3 py-2">
                  <label className="inline-flex items-center gap-2 cursor-pointer text-sm">
                    <input
                      type="checkbox"
                      className="rounded border-esm-border"
                      checked={Boolean(r.confirmed)}
                      onChange={(e) => setRow(i, { confirmed: e.target.checked })}
                    />
                    <span>I confirm</span>
                  </label>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
