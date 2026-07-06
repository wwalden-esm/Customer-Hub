"use client";

import type { CommunicationData } from "@/types";
import { Field, inputClass, textareaClass } from "../fields";
import { SectionIntro } from "../primitives";

interface Props {
  data: Record<string, unknown>;
  onChange: (d: Record<string, unknown>) => void;
  readOnly?: boolean;
}

export function CommunicationSection({ data, onChange, readOnly }: Props) {
  const d = data as CommunicationData;
  const set = (patch: Partial<CommunicationData>) => onChange({ ...d, ...patch } as unknown as Record<string, unknown>);

  if (readOnly) {
    return (
      <div>
        <SectionIntro>This section is managed by your ESM Solution Consultant.</SectionIntro>
        <div className="rounded border border-slate-200 bg-slate-50 p-4 space-y-3">
          <ReadOnlyRow label="Status meeting" value={d.statusCadenceConfirmed} />
          <ReadOnlyRow label="Steering committee" value={d.steeringCadenceConfirmed} />
          <ReadOnlyRow label="Workstream sessions" value={d.workstreamCadenceConfirmed} />
          <ReadOnlyRow label="Time zone" value={d.customerTimeZone} />
          <ReadOnlyRow label="Meeting platform" value={d.preferredMeetingPlatform} />
          <ReadOnlyRow label="Blackout periods" value={d.blackoutPeriods} />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <SectionIntro>ESM standard cadence. Confirm or override each.</SectionIntro>

      <div className="rounded border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="px-3 py-2 text-left font-medium">Meeting</th>
              <th className="px-3 py-2 text-left font-medium">ESM default</th>
              <th className="px-3 py-2 text-left font-medium">Your confirmation / override</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            <tr>
              <td className="px-3 py-2">Implementation status meeting</td>
              <td className="px-3 py-2 text-slate-600">Weekly, 60–90 min</td>
              <td className="px-3 py-2">
                <input className={inputClass} value={d.statusCadenceConfirmed ?? ""} onChange={(e) => set({ statusCadenceConfirmed: e.target.value })} placeholder="e.g., Confirmed weekly Tuesdays 10am ET" />
              </td>
            </tr>
            <tr>
              <td className="px-3 py-2">Project steering committee</td>
              <td className="px-3 py-2 text-slate-600">Bi-weekly</td>
              <td className="px-3 py-2">
                <input className={inputClass} value={d.steeringCadenceConfirmed ?? ""} onChange={(e) => set({ steeringCadenceConfirmed: e.target.value })} />
              </td>
            </tr>
            <tr>
              <td className="px-3 py-2">Workstream sessions (workflow, integration, supplier enablement)</td>
              <td className="px-3 py-2 text-slate-600">Ad-hoc as needed</td>
              <td className="px-3 py-2">
                <input className={inputClass} value={d.workstreamCadenceConfirmed ?? ""} onChange={(e) => set({ workstreamCadenceConfirmed: e.target.value })} />
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <Field label="Customer time zone" required>
        <input className={inputClass} value={d.customerTimeZone ?? ""} onChange={(e) => set({ customerTimeZone: e.target.value })} placeholder="e.g., America/Chicago" />
      </Field>
      <Field label="Preferred meeting platform" required hint="Teams, Zoom, etc.">
        <input className={inputClass} value={d.preferredMeetingPlatform ?? ""} onChange={(e) => set({ preferredMeetingPlatform: e.target.value })} />
      </Field>
      <Field label="Blackout periods to plan around" hint="Commencement, fiscal close, registration, etc.">
        <textarea className={textareaClass} value={d.blackoutPeriods ?? ""} onChange={(e) => set({ blackoutPeriods: e.target.value })} />
      </Field>
    </div>
  );
}

function ReadOnlyRow({ label, value }: { label: string; value?: string }) {
  return (
    <div className="flex gap-4">
      <span className="text-sm font-medium text-slate-600 w-48 shrink-0">{label}</span>
      <span className="text-sm text-slate-900">{value || "—"}</span>
    </div>
  );
}
