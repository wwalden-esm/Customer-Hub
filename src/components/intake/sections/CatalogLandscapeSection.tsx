"use client";

import { useMemo } from "react";
import type { CatalogLandscapeData, CatalogSupplier } from "@/types";
import { CATALOG_SUPPLIER_SLOTS } from "@/types";
import { Field, inputClass, textareaClass } from "../fields";
import { AttachmentUpload, SectionIntro } from "../primitives";

const TIER_OPTIONS = ["Preferred", "Contracted", "Approved"] as const;

interface Props {
  data: Record<string, unknown>;
  onChange: (d: Record<string, unknown>) => void;
  projectId: string;
}

export function CatalogLandscapeSection({ data, onChange, projectId }: Props) {
  const d = data as CatalogLandscapeData;
  const suppliers = useMemo<CatalogSupplier[]>(() => {
    const existing = d.suppliers ?? [];
    return Array.from({ length: CATALOG_SUPPLIER_SLOTS }, (_, i) => existing[i] ?? { supplier: "", tier: "" });
  }, [d.suppliers]);

  const setSupplier = (idx: number, patch: Partial<CatalogSupplier>) => {
    const next = suppliers.map((s, i) => (i === idx ? { ...s, ...patch } : s));
    onChange({ ...d, suppliers: next } as unknown as Record<string, unknown>);
  };
  const set = (patch: Partial<CatalogLandscapeData>) => onChange({ ...d, ...patch } as unknown as Record<string, unknown>);

  return (
    <div className="space-y-5">
      <SectionIntro>
        ESM maintains a master list of established catalog suppliers. Reference the ESM Catalog Supplier List provided
        separately and select the suppliers you intend to enable in this phase. Catalog-type-per-supplier (hosted vs
        punch-out) and detailed enablement is handled by ESM&apos;s Supplier Enablement Consultant separately.
      </SectionIntro>

      <Field label="Catalog supplier list attachment" hint="Upload an Excel or CSV file listing your current catalog suppliers.">
        <AttachmentUpload
          sectionKey="CATALOG_LANDSCAPE"
          projectId={projectId}
          hint="Excel (.xlsx) or CSV file, up to 25 MB."
        />
      </Field>

      <div className="overflow-x-auto">
        <table className="w-full text-sm border border-slate-200 rounded">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-3 py-2 text-left text-slate-600 font-medium border-b w-12">#</th>
              <th className="px-3 py-2 text-left text-slate-600 font-medium border-b">Supplier (from ESM Catalog Supplier List)</th>
              <th className="px-3 py-2 text-left text-slate-600 font-medium border-b w-48">Priority Tier</th>
            </tr>
          </thead>
          <tbody>
            {suppliers.map((s, i) => (
              <tr key={i} className="border-b border-slate-100">
                <td className="px-3 py-2 text-slate-500">{i + 1}</td>
                <td className="px-1 py-1">
                  <input
                    className="w-full rounded border border-slate-200 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-esm-red/40"
                    value={s.supplier ?? ""}
                    onChange={(e) => setSupplier(i, { supplier: e.target.value })}
                  />
                </td>
                <td className="px-1 py-1">
                  <select
                    className={inputClass}
                    value={s.tier ?? ""}
                    onChange={(e) => setSupplier(i, { tier: e.target.value as CatalogSupplier["tier"] })}
                  >
                    <option value="">—</option>
                    {TIER_OPTIONS.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Field label="Existing contracts or state contract pricing ESM should know about">
        <textarea className={textareaClass} value={d.existingContracts ?? ""} onChange={(e) => set({ existingContracts: e.target.value })} />
      </Field>
      <Field label="Will non-catalog (free-text) ordering be enabled? Any restrictions?" required>
        <textarea className={textareaClass} value={d.nonCatalogAllowed ?? ""} onChange={(e) => set({ nonCatalogAllowed: e.target.value })} />
      </Field>
    </div>
  );
}
