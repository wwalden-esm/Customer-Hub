"use client";

import type { ProjectTeamData, TeamMember } from "@/types";
import { DynamicRowTable, SectionIntro, type ColumnDef } from "../primitives";

const COLUMNS: ReadonlyArray<ColumnDef<TeamMember>> = [
  { key: "name", label: "Name" },
  { key: "title", label: "Title" },
  { key: "projectRole", label: "Project Role" },
  { key: "email", label: "Email", type: "email" },
  { key: "phone", label: "Phone", type: "tel" },
];

interface Props {
  data: Record<string, unknown>;
  onChange: (d: Record<string, unknown>) => void;
}

const newMember = (): TeamMember => ({ name: "", title: "", projectRole: "", email: "", phone: "" });

export function ProjectTeamSection({ data, onChange }: Props) {
  const d = data as ProjectTeamData;
  const update = (patch: Partial<ProjectTeamData>) => onChange({ ...d, ...patch } as unknown as Record<string, unknown>);
  return (
    <div className="space-y-6">
      <SectionIntro>
        Single source of truth for the project team. Add rows as needed. Your ESM team will be added by your Solution
        Consultant. This is the only document where the team roster lives — other artifacts reference back here.
      </SectionIntro>

      <div>
        <h3 className="text-sm font-medium text-slate-800 mb-2">Customer team</h3>
        <DynamicRowTable<TeamMember>
          rows={d.customerTeam ?? []}
          columns={COLUMNS}
          newRow={newMember}
          onChange={(rows) => update({ customerTeam: rows })}
          addLabel="Add team member"
          minRows={3}
        />
      </div>

      <div>
        <h3 className="text-sm font-medium text-slate-800 mb-2">
          ERP partner team <span className="text-slate-400 font-normal">(Ellucian, Workday, Oracle, etc., if applicable)</span>
        </h3>
        <DynamicRowTable<TeamMember>
          rows={d.erpPartnerTeam ?? []}
          columns={COLUMNS}
          newRow={newMember}
          onChange={(rows) => update({ erpPartnerTeam: rows })}
          addLabel="Add partner contact"
          minRows={1}
        />
      </div>
    </div>
  );
}
