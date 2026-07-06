"use client";

import type { ProcurementGuidelinesData, SpendTier } from "@/types";
import { Field, textareaClass } from "../fields";
import { AttachmentUpload, DynamicRowTable, SectionIntro, type ColumnDef } from "../primitives";

const COLS: ReadonlyArray<ColumnDef<SpendTier>> = [
  { key: "spendRange", label: "Spend range", placeholder: "e.g., $0 – $9,999" },
  { key: "requirement", label: "Requirement", placeholder: "Quotes / bids / board approval / etc." },
  { key: "appliesTo", label: "Applies to", placeholder: "All / Specific funds / Capital" },
];

const newTier = (): SpendTier => ({ spendRange: "", requirement: "", appliesTo: "" });

interface Props {
  data: Record<string, unknown>;
  onChange: (d: Record<string, unknown>) => void;
  projectId: string;
}

export function ProcurementGuidelinesSection({ data, onChange, projectId }: Props) {
  const d = data as ProcurementGuidelinesData;
  const set = (patch: Partial<ProcurementGuidelinesData>) => onChange({ ...d, ...patch } as unknown as Record<string, unknown>);
  return (
    <div className="space-y-5">
      <SectionIntro>
        Please attach your current procurement policy or guidelines document, then summarize spend thresholds below.
      </SectionIntro>

      <Field label="Procurement policy attachment">
        <AttachmentUpload
          sectionKey="PROCUREMENT_GUIDELINES"
          projectId={projectId}
          uploaded={d.policyAttached}
          hint="PDF or Word document, up to 25 MB."
          onUploaded={() => set({ policyAttached: true })}
        />
      </Field>

      <Field label="Spend threshold tiers" required hint="At least one row.">
        <DynamicRowTable<SpendTier>
          rows={d.spendTiers ?? []}
          columns={COLS}
          newRow={newTier}
          onChange={(rows) => set({ spendTiers: rows })}
          addLabel="Add tier"
          minRows={1}
        />
      </Field>

      <Field label="Tax status" required hint="Exempt? Jurisdiction-specific rules?">
        <textarea className={textareaClass} value={d.taxStatus ?? ""} onChange={(e) => set({ taxStatus: e.target.value })} />
      </Field>
      <Field label="Standard payment terms" required>
        <textarea className={textareaClass} value={d.paymentTerms ?? ""} onChange={(e) => set({ paymentTerms: e.target.value })} placeholder="e.g., Net 30" />
      </Field>
      <Field label="Other procurement rules ESM should know about" hint="Emergency purchases, sole-source justification, sponsored research, etc.">
        <textarea className={textareaClass} value={d.otherRules ?? ""} onChange={(e) => set({ otherRules: e.target.value })} />
      </Field>
    </div>
  );
}
