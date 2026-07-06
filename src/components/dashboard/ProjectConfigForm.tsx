"use client";

import { useState } from "react";
import { ALL_DOC_TYPES } from "./EsmDocumentsClient";

interface Project {
  id: string;
  customerName: string;
  projectName: string;
  branding: { accentColor?: string; logoUrl?: string };
  password?: string;
  sectionVisibility?: Record<string, boolean>;
  documentTypes?: string[];
  smartsheetConfig?: Record<string, string | undefined>;
}

const HUB_SECTIONS = [
  { key: "intake", label: "Intake", description: "HubSpot intake data" },
  { key: "raid-log", label: "RAID Log", description: "Risks, actions, issues, decisions" },
  { key: "meetings", label: "Meetings", description: "Meeting tracker" },
  { key: "documents", label: "Documents", description: "Document library and uploads" },
  { key: "recordings", label: "Recordings", description: "SharePoint meeting recordings" },
];

export default function ProjectConfigForm({ project }: { project: Project }) {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [accentColor, setAccentColor] = useState(project.branding?.accentColor || "#1E3A5F");
  const [logoUrl, setLogoUrl] = useState(project.branding?.logoUrl || "");
  const [password, setPassword] = useState(project.password || "");
  const [sectionVisibility, setSectionVisibility] = useState<Record<string, boolean>>(() => {
    const vis = project.sectionVisibility ?? {};
    const result: Record<string, boolean> = {};
    for (const s of HUB_SECTIONS) {
      result[s.key] = vis[s.key] !== false;
    }
    return result;
  });
  const [docTypes, setDocTypes] = useState<Record<string, boolean>>(() => {
    const enabled = project.documentTypes;
    const result: Record<string, boolean> = {};
    for (const dt of ALL_DOC_TYPES) {
      result[dt.key] = enabled ? enabled.includes(dt.key) : true;
    }
    return result;
  });

  function toggleSection(key: string) {
    setSectionVisibility((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function toggleDocType(key: string) {
    setDocTypes((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch(`/api/projects/${project.id}/config`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          branding: { accentColor, logoUrl: logoUrl || undefined },
          password,
          sectionVisibility,
          documentTypes: ALL_DOC_TYPES.filter((dt) => docTypes[dt.key]).map((dt) => dt.key),
        }),
      });
      if (res.ok) setSaved(true);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Branding */}
      <section className="bg-white rounded-sm border border-[#E2E0E1] p-5">
        <h2 className="text-sm font-bold text-esm-grey uppercase tracking-wider mb-4">Branding</h2>
        <div className="space-y-4">
          <div>
            <label htmlFor="accent-color" className="block text-sm font-medium text-esm-black mb-1">Accent Color</label>
            <div className="flex items-center gap-3">
              <input
                id="accent-color"
                type="color"
                value={accentColor}
                onChange={(e) => setAccentColor(e.target.value)}
                className="w-10 h-10 border border-[#E2E0E1] rounded cursor-pointer"
              />
              <input
                type="text"
                value={accentColor}
                onChange={(e) => setAccentColor(e.target.value)}
                className="border border-[#E2E0E1] rounded px-3 py-1.5 text-sm font-mono w-28"
                aria-label="Accent color hex value"
              />
              <div className="h-8 w-24 rounded" style={{ backgroundColor: accentColor }} />
            </div>
            <p className="text-xs text-esm-grey mt-1">Applied to the customer portal nav, milestones, and metric cards.</p>
          </div>
          <div>
            <label htmlFor="logo-url" className="block text-sm font-medium text-esm-black mb-1">Logo URL</label>
            <input
              id="logo-url"
              type="text"
              value={logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
              placeholder="https://example.com/logo.png"
              className="w-full border border-[#E2E0E1] rounded px-3 py-1.5 text-sm"
            />
            <p className="text-xs text-esm-grey mt-1">Shown alongside the ESM logo in the customer portal header.</p>
          </div>
        </div>
      </section>

      {/* Portal Access */}
      <section className="bg-white rounded-sm border border-[#E2E0E1] p-5">
        <h2 className="text-sm font-bold text-esm-grey uppercase tracking-wider mb-4">Portal Access</h2>
        <div>
          <label htmlFor="portal-password" className="block text-sm font-medium text-esm-black mb-1">Customer Portal Password</label>
          <input
            id="portal-password"
            type="text"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border border-[#E2E0E1] rounded px-3 py-1.5 text-sm font-mono max-w-sm"
          />
          <p className="text-xs text-esm-grey mt-1">Customers use this password to log in to their project portal.</p>
        </div>
      </section>

      {/* Hub Sections */}
      <section className="bg-white rounded-sm border border-[#E2E0E1] p-5">
        <h2 className="text-sm font-bold text-esm-grey uppercase tracking-wider mb-4">Hub Sections</h2>
        <p className="text-xs text-esm-grey mb-3">Choose which sections are visible in the customer portal. Dashboard is always shown.</p>
        <div className="space-y-2">
          {HUB_SECTIONS.map((s) => (
            <label key={s.key} className="flex items-center gap-3 py-2 px-3 rounded hover:bg-slate-50 cursor-pointer">
              <input
                type="checkbox"
                checked={sectionVisibility[s.key]}
                onChange={() => toggleSection(s.key)}
                className="w-4 h-4 rounded border-slate-300 text-esm-red focus:ring-esm-red"
              />
              <div>
                <span className="text-sm font-medium text-esm-black">{s.label}</span>
                <span className="text-xs text-esm-grey ml-2">{s.description}</span>
              </div>
            </label>
          ))}
        </div>
      </section>

      {/* Document Types */}
      <section className="bg-white rounded-sm border border-[#E2E0E1] p-5">
        <h2 className="text-sm font-bold text-esm-grey uppercase tracking-wider mb-4">Document Types</h2>
        <p className="text-xs text-esm-grey mb-3">Choose which document types are available for generation on this project.</p>
        <div className="space-y-2">
          {ALL_DOC_TYPES.map((dt) => (
            <label key={dt.key} className="flex items-center gap-3 py-2 px-3 rounded hover:bg-slate-50 cursor-pointer">
              <input
                type="checkbox"
                checked={docTypes[dt.key]}
                onChange={() => toggleDocType(dt.key)}
                className="w-4 h-4 rounded border-slate-300 text-esm-red focus:ring-esm-red"
              />
              <div>
                <span className="text-sm font-medium text-esm-black">{dt.label}</span>
                <span className="text-xs text-esm-grey ml-2">{dt.category}</span>
              </div>
            </label>
          ))}
        </div>
      </section>

      {/* Smartsheet IDs (read-only) */}
      <section className="bg-white rounded-sm border border-[#E2E0E1] p-5">
        <h2 className="text-sm font-bold text-esm-grey uppercase tracking-wider mb-4">Smartsheet Configuration</h2>
        {project.smartsheetConfig && Object.keys(project.smartsheetConfig).length > 0 ? (
          <div className="space-y-2 text-sm">
            {Object.entries(project.smartsheetConfig).map(([key, val]) => (
              <div key={key} className="flex justify-between items-center py-1 border-b border-gray-100 last:border-0">
                <span className="text-esm-grey">{key}</span>
                <code className="text-xs bg-gray-50 px-2 py-0.5 rounded text-esm-black">{val}</code>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-esm-grey">No Smartsheet sheets linked. Use the &quot;Link Sheets&quot; button on the project dashboard to connect.</p>
        )}
      </section>

      {/* Save */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-5 py-2 text-sm font-medium text-white bg-esm-red rounded hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save Configuration"}
        </button>
        {saved && <span className="text-sm text-emerald-600">Saved successfully</span>}
      </div>
    </div>
  );
}
