"use client";

import { useMemo } from "react";
import type { ChangeFieldRow, CopyFieldRow, TransactionPreferencesData, YNT } from "@/types";
import { COPY_FIELDS_DEFAULT, CHANGE_FIELDS_DEFAULT } from "@/types";
import { SectionIntro, YntSelector } from "../primitives";

interface Props {
  data: Record<string, unknown>;
  onChange: (d: Record<string, unknown>) => void;
}

export function TransactionPreferencesSection({ data, onChange }: Props) {
  const d = data as TransactionPreferencesData;

  const copy = useMemo<CopyFieldRow[]>(() => mergeRows(d.copy, COPY_FIELDS_DEFAULT), [d.copy]);
  const change = useMemo<ChangeFieldRow[]>(() => mergeRows(d.change, CHANGE_FIELDS_DEFAULT), [d.change]);

  const setCopy = (idx: number, patch: Partial<CopyFieldRow>) => {
    const next = copy.map((r, i) => (i === idx ? { ...r, ...patch } : r));
    onChange({ ...d, copy: next } as unknown as Record<string, unknown>);
  };
  const setChange = (idx: number, patch: Partial<ChangeFieldRow>) => {
    const next = change.map((r, i) => (i === idx ? { ...r, ...patch } : r));
    onChange({ ...d, change: next } as unknown as Record<string, unknown>);
  };

  return (
    <div className="space-y-8">
      <div className="rounded border-l-4 border-amber-400 bg-amber-50 p-4">
        <p className="text-sm text-amber-900">
          <strong>Workshop review:</strong> Take an initial pass using the explanations as guidance. We&apos;ll review
          your answers together in a workshop and address any TBDs.
        </p>
      </div>

      <SectionIntro>
        These preferences determine how the system behaves when users copy transactions or create change orders. Mark Y,
        N, or TBD for each field.
      </SectionIntro>

      <section>
        <h3 className="text-lg font-medium text-slate-900 mb-2">Transaction copy</h3>
        <p className="text-sm text-slate-600 mb-3">
          When a user copies an existing transaction (e.g., to repeat a similar order), which fields should
          automatically carry over to the new transaction?
        </p>
        <PrefTable rows={copy} allowLabel="Allow Copy?" onChangeRow={setCopy} name="copy" />
      </section>

      <section>
        <h3 className="text-lg font-medium text-slate-900 mb-2">Change order</h3>
        <p className="text-sm text-slate-600 mb-3">
          When a user creates a change order against an existing PO, which fields should they be permitted to modify?
        </p>
        <PrefTable rows={change} allowLabel="Allow Change?" onChangeRow={setChange} name="change" />
      </section>
    </div>
  );
}

function mergeRows<T extends { field: string; allow?: YNT; notes?: string }>(
  existing: T[] | undefined,
  defaults: T[],
): T[] {
  if (!existing) return defaults.map((r) => ({ ...r }));
  return defaults.map((def) => {
    const match = existing.find((e) => e.field === def.field);
    return match ? ({ ...def, allow: match.allow, notes: match.notes } as T) : ({ ...def } as T);
  });
}

interface PrefTableProps<T extends { field: string; allow?: YNT; notes?: string }> {
  rows: T[];
  allowLabel: string;
  onChangeRow: (idx: number, patch: Partial<T>) => void;
  name: string;
}

function PrefTable<T extends { field: string; allow?: YNT; notes?: string }>({
  rows,
  allowLabel,
  onChangeRow,
  name,
}: PrefTableProps<T>) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border border-slate-200 rounded">
        <thead className="bg-slate-50">
          <tr>
            <th className="px-3 py-2 text-left text-slate-600 font-medium border-b">Field</th>
            <th className="px-3 py-2 text-left text-slate-600 font-medium border-b w-40">{allowLabel}</th>
            <th className="px-3 py-2 text-left text-slate-600 font-medium border-b">Notes</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.field} className="border-b border-slate-100">
              <td className="px-3 py-2 text-slate-700">{r.field}</td>
              <td className="px-3 py-2">
                <YntSelector
                  name={`${name}-${i}`}
                  value={(r.allow ?? "") as YNT}
                  onChange={(v) => onChangeRow(i, { allow: v } as Partial<T>)}
                />
              </td>
              <td className="px-1 py-1">
                <input
                  className="w-full rounded border border-slate-200 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-esm-red/40"
                  value={r.notes ?? ""}
                  onChange={(e) => onChangeRow(i, { notes: e.target.value } as Partial<T>)}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
