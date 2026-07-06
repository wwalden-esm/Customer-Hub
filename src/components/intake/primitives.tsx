"use client";

import { useState, type ReactNode } from "react";
import { Field, inputClass, textareaClass } from "./fields";
import type { WorkshopAck, YNT } from "@/types";

interface WorkshopPanelProps {
  description: string;
  data: WorkshopAck;
  onChange: (d: WorkshopAck) => void;
}

export function WorkshopPanel({ description, data, onChange }: WorkshopPanelProps) {
  return (
    <div className="space-y-4">
      <div className="rounded border-l-4 border-blue-500 bg-blue-50 p-4">
        <h3 className="text-sm font-semibold text-blue-900">Workshop Section</h3>
        <p className="mt-1 text-sm text-blue-800">{description}</p>
      </div>
      <Field label="Any pre-workshop notes (optional)">
        <textarea
          className={textareaClass}
          value={data.customerNotes ?? ""}
          onChange={(e) => onChange({ ...data, customerNotes: e.target.value })}
          placeholder="Anything you want your SC to know before the workshop"
        />
      </Field>
      <label className="flex items-start gap-3 p-3 border border-slate-200 rounded hover:bg-slate-50 cursor-pointer">
        <input
          type="checkbox"
          className="mt-0.5 rounded border-slate-300"
          checked={Boolean(data.acknowledged)}
          onChange={(e) => onChange({ ...data, acknowledged: e.target.checked })}
        />
        <span className="text-sm text-slate-700">
          I acknowledge this section will be completed in a workshop with my ESM Solution Consultant.
        </span>
      </label>
    </div>
  );
}

export interface FieldDef<T> {
  key: keyof T & string;
  label: string;
  type?: "text" | "email" | "tel" | "url" | "textarea" | "select";
  required?: boolean;
  hint?: string;
  options?: readonly string[];
  placeholder?: string;
}

interface FieldListProps<T extends object> {
  data: T;
  fields: ReadonlyArray<FieldDef<T>>;
  onChange: (d: T) => void;
}

export function FieldList<T extends object>({ data, fields, onChange }: FieldListProps<T>) {
  const set = (key: keyof T, v: string) => onChange({ ...data, [key]: v });
  return (
    <div className="space-y-4">
      {fields.map((f) => {
        const value = (data[f.key] as string | undefined) ?? "";
        return (
          <Field key={f.key} label={f.label} required={f.required} hint={f.hint}>
            {f.type === "textarea" ? (
              <textarea className={textareaClass} value={value} onChange={(e) => set(f.key, e.target.value)} placeholder={f.placeholder} />
            ) : f.type === "select" ? (
              <select className={inputClass} value={value} onChange={(e) => set(f.key, e.target.value)}>
                <option value="">— Select —</option>
                {(f.options ?? []).map((o) => (
                  <option key={o} value={o}>{o}</option>
                ))}
              </select>
            ) : (
              <input
                type={f.type ?? "text"}
                className={inputClass}
                value={value}
                onChange={(e) => set(f.key, e.target.value)}
                placeholder={f.placeholder}
              />
            )}
          </Field>
        );
      })}
    </div>
  );
}

export interface ColumnDef<T> {
  key: keyof T & string;
  label: string;
  type?: "text" | "email" | "tel" | "date" | "select";
  options?: readonly string[];
  placeholder?: string;
  width?: string;
}

interface DynamicRowTableProps<T extends object> {
  rows: T[];
  columns: ReadonlyArray<ColumnDef<T>>;
  onChange: (rows: T[]) => void;
  newRow: () => T;
  addLabel?: string;
  minRows?: number;
  maxRows?: number;
}

export function DynamicRowTable<T extends object>({
  rows,
  columns,
  onChange,
  newRow,
  addLabel = "Add row",
  minRows = 1,
  maxRows,
}: DynamicRowTableProps<T>) {
  const safeRows = rows.length === 0 ? Array.from({ length: minRows }, newRow) : rows;
  const setCell = (rowIdx: number, col: keyof T, v: string) => {
    const next = safeRows.map((r, i) => (i === rowIdx ? { ...r, [col]: v } : r));
    onChange(next);
  };
  const removeRow = (rowIdx: number) => {
    if (safeRows.length <= minRows) return;
    onChange(safeRows.filter((_, i) => i !== rowIdx));
  };
  const addRow = () => {
    if (maxRows && safeRows.length >= maxRows) return;
    onChange([...safeRows, newRow()]);
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border border-slate-200 rounded">
        <thead className="bg-slate-50">
          <tr>
            {columns.map((c) => (
              <th key={c.key} className="px-2 py-2 text-left text-slate-600 font-medium border-b border-slate-200" style={c.width ? { width: c.width } : undefined}>
                {c.label}
              </th>
            ))}
            <th className="w-10 border-b border-slate-200" />
          </tr>
        </thead>
        <tbody>
          {safeRows.map((row, rIdx) => (
            <tr key={rIdx} className="border-b border-slate-100">
              {columns.map((c) => {
                const value = (row[c.key] as string | undefined) ?? "";
                return (
                  <td key={c.key} className="px-1 py-1">
                    {c.type === "select" ? (
                      <select
                        className="w-full rounded border border-slate-200 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-esm-red/40"
                        value={value}
                        onChange={(e) => setCell(rIdx, c.key, e.target.value)}
                      >
                        <option value="">—</option>
                        {(c.options ?? []).map((o) => (
                          <option key={o} value={o}>{o}</option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type={c.type ?? "text"}
                        className="w-full rounded border border-slate-200 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-esm-red/40"
                        value={value}
                        onChange={(e) => setCell(rIdx, c.key, e.target.value)}
                        placeholder={c.placeholder}
                      />
                    )}
                  </td>
                );
              })}
              <td className="px-1 py-1 text-center">
                <button
                  type="button"
                  onClick={() => removeRow(rIdx)}
                  disabled={safeRows.length <= minRows}
                  className="text-slate-400 hover:text-red-600 disabled:opacity-30 disabled:cursor-not-allowed"
                  aria-label="Remove row"
                  title="Remove row"
                >
                  ×
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <button
        type="button"
        onClick={addRow}
        disabled={maxRows ? safeRows.length >= maxRows : false}
        className="mt-2 text-sm text-esm-red hover:text-esm-red-dark disabled:opacity-50"
      >
        + {addLabel}
      </button>
    </div>
  );
}

interface YntSelectorProps {
  value: YNT;
  onChange: (v: YNT) => void;
  name: string;
}

export function YntSelector({ value, onChange, name }: YntSelectorProps) {
  const options: { value: YNT; label: string }[] = [
    { value: "Y", label: "Y" },
    { value: "N", label: "N" },
    { value: "TBD", label: "TBD" },
  ];
  return (
    <div className="inline-flex gap-2">
      {options.map((o) => (
        <label key={o.value} className="inline-flex items-center gap-1 cursor-pointer text-sm">
          <input
            type="radio"
            name={name}
            value={o.value}
            checked={value === o.value}
            onChange={() => onChange(o.value)}
            className="border-slate-300"
          />
          <span>{o.label}</span>
        </label>
      ))}
    </div>
  );
}

interface AttachmentUploadProps {
  sectionKey: string;
  projectId: string;
  hint?: string;
  uploaded?: boolean;
  onUploaded?: (info: { fileName: string }) => void;
}

export function AttachmentUpload({ sectionKey, projectId, hint, uploaded, onUploaded }: AttachmentUploadProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  async function handleFile(file: File) {
    setBusy(true);
    setError(null);
    const form = new FormData();
    form.append("file", file);
    form.append("sectionKey", sectionKey);
    try {
      const res = await fetch(`/api/projects/${projectId}/attachments`, { method: "POST", body: form });
      if (!res.ok) {
        const j = await res.json().catch(() => null);
        throw new Error(j?.message || `Upload failed (${res.status})`);
      }
      const json = (await res.json()) as { fileName: string };
      setFileName(json.fileName);
      onUploaded?.(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded border border-dashed border-slate-300 bg-slate-50 p-4">
      <label className="flex items-center gap-3 cursor-pointer">
        <input
          type="file"
          className="block text-sm text-slate-600 file:mr-3 file:rounded file:border-0 file:bg-esm-red file:px-3 file:py-1.5 file:text-white file:hover:bg-esm-red-dark file:cursor-pointer"
          disabled={busy}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void handleFile(f);
          }}
        />
        {busy && <span className="text-sm text-slate-500">Uploading…</span>}
      </label>
      {hint && <p className="mt-2 text-xs text-slate-500">{hint}</p>}
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      {(fileName || uploaded) && (
        <p className="mt-2 text-sm text-emerald-700">✓ {fileName ?? "File uploaded previously"}</p>
      )}
    </div>
  );
}

export function SectionIntro({ children }: { children: ReactNode }) {
  return <div className="text-sm text-slate-600 mb-4">{children}</div>;
}
