"use client";

import type { InstitutionalProfileData } from "@/types";
import { FieldList, SectionIntro, type FieldDef } from "../primitives";

const FIELDS: ReadonlyArray<FieldDef<InstitutionalProfileData>> = [
  { key: "institutionType", label: "Institution type", required: true, hint: "R1, R2, regional public, private, community college, K-12 district, etc." },
  { key: "governingAuthority", label: "Governing authority or oversight bodies", required: true, hint: "State procurement, board of regents, etc.", type: "textarea" },
  { key: "procurementModel", label: "Procurement model", required: true, type: "select", options: ["Centralized", "Federated", "Hybrid"] },
  { key: "campusCount", label: "Number of physical campuses or major locations", required: true },
];

interface Props {
  data: Record<string, unknown>;
  onChange: (d: Record<string, unknown>) => void;
}

export function InstitutionalProfileSection({ data, onChange }: Props) {
  return (
    <div>
      <SectionIntro>
        Brief context about your institution. Just type — enrollment, employee counts, and spend totals are not needed.
      </SectionIntro>
      <FieldList<InstitutionalProfileData>
        data={data as InstitutionalProfileData}
        fields={FIELDS}
        onChange={(d) => onChange(d as unknown as Record<string, unknown>)}
      />
    </div>
  );
}
