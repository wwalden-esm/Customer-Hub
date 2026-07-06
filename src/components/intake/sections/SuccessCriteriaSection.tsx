"use client";

import type { SuccessCriteriaData } from "@/types";
import { Field, textareaClass } from "../fields";
import { SectionIntro } from "../primitives";

const DOD_ITEMS = [
  "All approval workflow queues configured and validated in the Training Environment",
  "Integration live for in-scope data flows (FOAPAL coding, budget reservation, PO creation, etc.)",
  "SSO configured and tested for all user roles",
  "Catalogs enabled, tested, and validated by customer functional lead",
  "Receiving configured and validated against test transactions",
  "UAT completed and signed off",
  "System Administrator trained; Train-the-Trainer delivered",
  "Power users identified, trained, and ready by Go-Live",
  "First live transaction issued through ESM and reflected in your ERP",
];

interface Props {
  data: Record<string, unknown>;
  onChange: (d: Record<string, unknown>) => void;
}

export function SuccessCriteriaSection({ data, onChange }: Props) {
  const d = data as SuccessCriteriaData;
  const set = (patch: Partial<SuccessCriteriaData>) => onChange({ ...d, ...patch } as unknown as Record<string, unknown>);
  return (
    <div className="space-y-5">
      <SectionIntro>
        List 3–5 measurable outcomes that will define success at Go-Live + 6 months. Be specific where possible
        (current baseline → target).
      </SectionIntro>

      <Field label="Your success outcomes" required>
        <textarea
          className={textareaClass}
          value={d.outcomes ?? ""}
          onChange={(e) => set({ outcomes: e.target.value })}
          placeholder="e.g., Cut average requisition-to-PO time from 6 days to 2 days by Go-Live + 6 months."
        />
      </Field>

      <div className="rounded border border-slate-200 p-4">
        <p className="text-sm font-medium text-slate-800 mb-2">ESM standard definition of done</p>
        <ul className="text-sm text-slate-600 list-disc pl-5 space-y-1">
          {DOD_ITEMS.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
        <label className="mt-4 flex items-start gap-3 p-3 border border-slate-200 rounded hover:bg-slate-50 cursor-pointer">
          <input
            type="checkbox"
            className="mt-0.5 rounded border-slate-300"
            checked={Boolean(d.dodAccepted)}
            onChange={(e) => set({ dodAccepted: e.target.checked })}
          />
          <span className="text-sm text-slate-700">I confirm we accept the ESM standard definition of done above.</span>
        </label>
      </div>
    </div>
  );
}
