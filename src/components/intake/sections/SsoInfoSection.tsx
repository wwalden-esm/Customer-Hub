"use client";

import type { SsoInfoData } from "@/types";
import { Field, inputClass } from "../fields";
import { AttachmentUpload, SectionIntro } from "../primitives";

interface Props {
  data: Record<string, unknown>;
  onChange: (d: Record<string, unknown>) => void;
  projectId: string;
}

export function SsoInfoSection({ data, onChange, projectId }: Props) {
  const d = data as SsoInfoData;
  const set = (patch: Partial<SsoInfoData>) => onChange({ ...d, ...patch } as unknown as Record<string, unknown>);
  return (
    <div className="space-y-5">
      <SectionIntro>
        SSO type and metadata are needed early — they gate user access setup. Please complete this section before
        workshops begin.
      </SectionIntro>

      <Field label="SSO type" required hint="Shibboleth, CAS, SAML 2.0, OIDC, ADFS, Okta, Azure AD/Entra, Google Workspace, etc.">
        <input className={inputClass} value={d.ssoType ?? ""} onChange={(e) => set({ ssoType: e.target.value })} />
      </Field>
      <Field label="IdP product name and version" required>
        <input className={inputClass} value={d.idpProductVersion ?? ""} onChange={(e) => set({ idpProductVersion: e.target.value })} />
      </Field>
      <div className="grid grid-cols-3 gap-4">
        <Field label="IdP administrator name" required>
          <input className={inputClass} value={d.idpAdminName ?? ""} onChange={(e) => set({ idpAdminName: e.target.value })} />
        </Field>
        <Field label="IdP administrator email" required>
          <input type="email" className={inputClass} value={d.idpAdminEmail ?? ""} onChange={(e) => set({ idpAdminEmail: e.target.value })} />
        </Field>
        <Field label="IdP administrator phone">
          <input type="tel" className={inputClass} value={d.idpAdminPhone ?? ""} onChange={(e) => set({ idpAdminPhone: e.target.value })} />
        </Field>
      </div>
      <Field label="MFA enforced at IdP?" required>
        <input className={inputClass} value={d.mfaEnforced ?? ""} onChange={(e) => set({ mfaEnforced: e.target.value })} placeholder="Yes / No / Conditional" />
      </Field>
      <Field label="User provisioning approach" required hint="SCIM, JIT, batch HR feed, manual">
        <input className={inputClass} value={d.provisioningApproach ?? ""} onChange={(e) => set({ provisioningApproach: e.target.value })} />
      </Field>

      <fieldset className="border border-slate-200 rounded p-4 space-y-3">
        <legend className="px-2 text-sm font-medium text-slate-700">SSO metadata — Training environment</legend>
        <Field label="Metadata URL" hint="Paste a URL or upload the metadata file below.">
          <input type="url" className={inputClass} value={d.trainingMetadataUrl ?? ""} onChange={(e) => set({ trainingMetadataUrl: e.target.value })} />
        </Field>
        <AttachmentUpload
          sectionKey="SSO_INFO"
          projectId={projectId}
          uploaded={d.trainingMetadataUploaded}
          hint="XML metadata file for Training, or any reference document."
          onUploaded={() => set({ trainingMetadataUploaded: true })}
        />
      </fieldset>

      <fieldset className="border border-slate-200 rounded p-4 space-y-3">
        <legend className="px-2 text-sm font-medium text-slate-700">SSO metadata — Production environment</legend>
        <Field label="Metadata URL" hint="Paste a URL or upload the metadata file below.">
          <input type="url" className={inputClass} value={d.productionMetadataUrl ?? ""} onChange={(e) => set({ productionMetadataUrl: e.target.value })} />
        </Field>
        <AttachmentUpload
          sectionKey="SSO_INFO"
          projectId={projectId}
          uploaded={d.productionMetadataUploaded}
          hint="XML metadata file for Production, or any reference document."
          onUploaded={() => set({ productionMetadataUploaded: true })}
        />
      </fieldset>

      <label className="flex items-start gap-3 p-3 border border-slate-200 rounded hover:bg-slate-50 cursor-pointer">
        <input
          type="checkbox"
          className="mt-0.5 rounded border-slate-300"
          checked={Boolean(d.esmAccountsAcknowledged)}
          onChange={(e) => set({ esmAccountsAcknowledged: e.target.checked })}
        />
        <span className="text-sm text-slate-700">
          I acknowledge that the ESM Solution Consultant and Solutions Architect each require an SSO account in our
          environment to support configuration and testing.
        </span>
      </label>
    </div>
  );
}
