"use client";

import type { PowerUser, PowerUsersData } from "@/types";
import { DynamicRowTable, SectionIntro, type ColumnDef } from "../primitives";

const COLUMNS: ReadonlyArray<ColumnDef<PowerUser>> = [
  { key: "name", label: "Name" },
  { key: "department", label: "Department" },
  { key: "role", label: "Role", type: "select", options: ["Shopper", "Requisitioner", "Approver", "Receiver"] },
  { key: "trainingDate", label: "Training Date Commitment", type: "date" },
];

const newUser = (): PowerUser => ({ name: "", department: "", role: "", trainingDate: "" });

interface Props {
  data: Record<string, unknown>;
  onChange: (d: Record<string, unknown>) => void;
}

export function PowerUsersSection({ data, onChange }: Props) {
  const d = data as PowerUsersData;
  return (
    <div className="space-y-4">
      <SectionIntro>
        Power users are early-adopter users from across the institution who train first, transact during Phase 1, and
        serve as champions for broader rollout. Identify your Phase 1 power users below.
      </SectionIntro>
      <DynamicRowTable<PowerUser>
        rows={d.users ?? []}
        columns={COLUMNS}
        newRow={newUser}
        onChange={(users) => onChange({ ...d, users } as unknown as Record<string, unknown>)}
        addLabel="Add power user"
        minRows={3}
      />
    </div>
  );
}
