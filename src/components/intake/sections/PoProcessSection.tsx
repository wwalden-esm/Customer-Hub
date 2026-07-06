"use client";

import type { PoProcessData } from "@/types";
import { Field, inputClass } from "../fields";
import { AttachmentUpload, SectionIntro } from "../primitives";

interface Props {
  data: Record<string, unknown>;
  onChange: (d: Record<string, unknown>) => void;
  projectId: string;
}

export function PoProcessSection({ data, onChange, projectId }: Props) {
  const d = data as PoProcessData;
  const set = (patch: Partial<PoProcessData>) => onChange({ ...d, ...patch } as unknown as Record<string, unknown>);
  return (
    <div className="space-y-5">
      <SectionIntro>Please attach a sample PO (any format).</SectionIntro>

      <Field label="Sample PO attachment">
        <AttachmentUpload
          sectionKey="PO_PROCESS"
          projectId={projectId}
          uploaded={d.samplePoAttached}
          hint="PDF, Word, or image — up to 25 MB."
          onUploaded={() => set({ samplePoAttached: true })}
        />
      </Field>

      <Field label="Standard PO terms and conditions" required>
        <input className={inputClass} value={d.standardTerms ?? ""} onChange={(e) => set({ standardTerms: e.target.value })} />
      </Field>
      <Field label="PO distribution method" required hint="Email, supplier portal, cXML, EDI, fax">
        <input className={inputClass} value={d.distributionMethod ?? ""} onChange={(e) => set({ distributionMethod: e.target.value })} />
      </Field>
      <Field label="Who can request PO changes after dispatch?" required>
        <input className={inputClass} value={d.whoCanRequestChanges ?? ""} onChange={(e) => set({ whoCanRequestChanges: e.target.value })} />
      </Field>
      <Field label="Do PO changes require re-approval?" required>
        <input className={inputClass} value={d.changesRequireReapproval ?? ""} onChange={(e) => set({ changesRequireReapproval: e.target.value })} placeholder="Yes / No / Depends on…" />
      </Field>
    </div>
  );
}
