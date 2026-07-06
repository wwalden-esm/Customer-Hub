"use client";

import type { CustomerProfileData } from "@/types";
import { SectionIntro } from "../primitives";

interface Props {
  data: Record<string, unknown>;
  onChange: (d: Record<string, unknown>) => void;
  readOnly?: boolean;
}

export function CustomerProfileSection({ data, readOnly }: Props) {
  const d = data as CustomerProfileData;

  if (readOnly) {
    return (
      <div>
        <SectionIntro>
          This information is managed by your ESM Solution Consultant and synced from Smartsheet.
        </SectionIntro>
        <div className="rounded border border-slate-200 bg-slate-50 p-4 space-y-3">
          <ProfileRow label="Institution legal name" value={d.institutionLegalName} />
          <ProfileRow label="Institution type" value={d.institutionType} />
          <ProfileRow label="Primary mailing address" value={d.primaryMailingAddress} />
          <ProfileRow label="ERP / Financial System" value={d.erpProductVersion} />
          <ProfileRow label="ERP hosting" value={d.erpHosting} />
          <ProfileRow label="ESM modules in scope" value={d.esmModulesInScope} />
        </div>
      </div>
    );
  }

  return (
    <div>
      <SectionIntro>Basic information about your institution and ERP environment.</SectionIntro>
      <div className="rounded border border-slate-200 bg-slate-50 p-4 space-y-3">
        <ProfileRow label="Institution legal name" value={d.institutionLegalName} />
        <ProfileRow label="Institution type" value={d.institutionType} />
        <ProfileRow label="Primary mailing address" value={d.primaryMailingAddress} />
        <ProfileRow label="ERP / Financial System" value={d.erpProductVersion} />
        <ProfileRow label="ERP hosting" value={d.erpHosting} />
        <ProfileRow label="ESM modules in scope" value={d.esmModulesInScope} />
      </div>
    </div>
  );
}

function ProfileRow({ label, value }: { label: string; value?: string }) {
  return (
    <div className="flex gap-4">
      <span className="text-sm font-medium text-slate-600 w-48 shrink-0">{label}</span>
      <span className="text-sm text-slate-900">{value || "—"}</span>
    </div>
  );
}
