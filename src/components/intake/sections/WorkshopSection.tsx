"use client";

import type { SectionKey } from "@/types/enums";
import type { WorkshopAck } from "@/types";
import { WorkshopPanel } from "../primitives";

const DESCRIPTIONS: Record<string, string> = {
  PHASE_SCOPE:
    "Phase scope is often refined between sales and implementation. Your ESM Solution Consultant will confirm this with you in the kickoff workshop.",
  GOVERNANCE:
    "Your SC will walk through this with you to confirm decision authority across workstreams (requirements sign-off, workflow routing, technical decisions, UAT acceptance, Go-Live authorization, change requests, escalation path).",
  RISKS:
    "Your SC will draft initial risks based on observed context. You'll add to and confirm them in the workshop, along with key assumptions and external dependencies.",
  APPROVAL_WORKFLOW:
    "We'll capture the high-level approval approach together. Detailed individual approver mappings (org→Dean, fund→PI, etc.) belong in the separate Workflow Document, completed closer to production.",
  GL_STRUCTURE:
    "Often technical — your SC will walk through this with your Finance and IT teams to capture GL/FOAPAL segments and accounting rules (encumbrance, budget checking, multi-currency, tax handling).",
  REPORTING_NEEDS:
    "Customers rarely know the full report list upfront. Your SC will walk through standard reports and identify priorities.",
  DATA_FILES_PLAN:
    "ESM will provide each data file template separately (Account Code, Location, UOM, Non-Catalog Vendor, User, Workflow, Aux Fields). We'll use the workshop to assign owners and target dates.",
  TEST_PERMISSIONS:
    "Project team members often need broader test permissions than they'll have in production. Your SC works through this with the project lead so the right people can validate the build.",
};

interface Props {
  sectionKey: SectionKey;
  data: Record<string, unknown>;
  onChange: (d: Record<string, unknown>) => void;
}

export function WorkshopSection({ sectionKey, data, onChange }: Props) {
  const desc = DESCRIPTIONS[sectionKey] ?? "This section will be completed in a workshop with your ESM Solution Consultant.";
  return (
    <WorkshopPanel
      description={desc}
      data={data as WorkshopAck}
      onChange={(d) => onChange(d as unknown as Record<string, unknown>)}
    />
  );
}
