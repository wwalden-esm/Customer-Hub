"use client";

import type { EsmTestingAccessData } from "@/types";
import { Field, inputClass } from "../fields";
import { SectionIntro } from "../primitives";

const API_KEY_WARNING =
  "This value will be stored securely. Do not enter production credentials until your IT team has confirmed this is the correct location.";

interface Props {
  data: Record<string, unknown>;
  onChange: (d: Record<string, unknown>) => void;
}

export function EsmTestingAccessSection({ data, onChange }: Props) {
  const d = data as EsmTestingAccessData;
  const set = (patch: Partial<EsmTestingAccessData>) => onChange({ ...d, ...patch } as unknown as Record<string, unknown>);
  return (
    <div className="space-y-5">
      <SectionIntro>
        ESM consultants need access to your environment to configure and test. Please provide the following before
        workshops begin where possible. ERP-specific items (e.g., Banner Tenet ID) only apply if relevant.
      </SectionIntro>

      <Field label="API key — Training environment" required warning={API_KEY_WARNING}>
        <input className={inputClass} value={d.apiKeyTraining ?? ""} onChange={(e) => set({ apiKeyTraining: e.target.value })} />
      </Field>
      <Field label="API key — Production environment" required warning={API_KEY_WARNING}>
        <input className={inputClass} value={d.apiKeyProduction ?? ""} onChange={(e) => set({ apiKeyProduction: e.target.value })} />
      </Field>
      <Field label="Banner Tenet ID — Training" hint="Only if Banner ERP">
        <input className={inputClass} value={d.bannerTenetTraining ?? ""} onChange={(e) => set({ bannerTenetTraining: e.target.value })} />
      </Field>
      <Field label="Banner Tenet ID — Production" hint="Only if Banner ERP">
        <input className={inputClass} value={d.bannerTenetProduction ?? ""} onChange={(e) => set({ bannerTenetProduction: e.target.value })} />
      </Field>

      <label className="flex items-start gap-3 p-3 border border-slate-200 rounded hover:bg-slate-50 cursor-pointer">
        <input
          type="checkbox"
          className="mt-0.5 rounded border-esm-border"
          checked={Boolean(d.esmAccountsAcknowledged)}
          onChange={(e) => set({ esmAccountsAcknowledged: e.target.checked })}
        />
        <span className="text-sm text-slate-700">
          I acknowledge that the ESM Solution Consultant and Solutions Architect each require an account in our
          purchasing system that mirrors purchasing-team permissions, so the ESM team can perform end-to-end testing.
        </span>
      </label>
    </div>
  );
}
