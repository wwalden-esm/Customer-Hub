"use client";

import { useState } from "react";
import { ALL_DOC_TYPES } from "./EsmDocumentsClient";

interface ProjectLink {
  label: string;
  url: string;
  icon?: string;
}

interface Project {
  id: string;
  customerName: string;
  projectName: string;
  branding: { accentColor?: string; logoUrl?: string };
  password?: string;
  sectionVisibility?: Record<string, boolean>;
  documentTypes?: string[];
  links?: ProjectLink[];
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
  const [links, setLinks] = useState<ProjectLink[]>(project.links ?? []);

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
          links: links.filter((l) => l.label.trim() && l.url.trim()),
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

      {/* Customer Links */}
      <section className="bg-white rounded-sm border border-[#E2E0E1] p-5">
        <h2 className="text-sm font-bold text-esm-grey uppercase tracking-wider mb-4">Customer Links</h2>
        <p className="text-xs text-esm-grey mb-3">Add links that will appear in the customer portal sidebar (e.g. training resources, SharePoint, Smartsheet views).</p>
        <div className="space-y-3">
          {links.map((link, i) => (
            <div key={i} className="flex items-start gap-2 p-3 bg-slate-50 rounded border border-gray-100">
              <div className="flex-1 space-y-2">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={link.label}
                    onChange={(e) => {
                      const updated = [...links];
                      updated[i] = { ...updated[i], label: e.target.value };
                      setLinks(updated);
                    }}
                    placeholder="Label"
                    className="flex-1 border border-[#E2E0E1] rounded px-3 py-1.5 text-sm"
                    aria-label={`Link ${i + 1} label`}
                  />
                  <select
                    value={link.icon || "link"}
                    onChange={(e) => {
                      const updated = [...links];
                      updated[i] = { ...updated[i], icon: e.target.value };
                      setLinks(updated);
                    }}
                    className="border border-[#E2E0E1] rounded px-2 py-1.5 text-sm w-32"
                    aria-label={`Link ${i + 1} icon`}
                  >
                    <option value="link">Link</option>
                    <option value="smartsheet">Smartsheet</option>
                    <option value="sharepoint">SharePoint</option>
                    <option value="document">Document</option>
                    <option value="video">Video</option>
                    <option value="calendar">Calendar</option>
                    <option value="training">Training</option>
                  </select>
                </div>
                <input
                  type="url"
                  value={link.url}
                  onChange={(e) => {
                    const updated = [...links];
                    updated[i] = { ...updated[i], url: e.target.value };
                    setLinks(updated);
                  }}
                  placeholder="https://..."
                  className="w-full border border-[#E2E0E1] rounded px-3 py-1.5 text-sm font-mono"
                  aria-label={`Link ${i + 1} URL`}
                />
              </div>
              <button
                type="button"
                onClick={() => setLinks(links.filter((_, j) => j !== i))}
                className="mt-1 p-1.5 text-slate-400 hover:text-esm-red transition-colors rounded hover:bg-red-50"
                aria-label={`Remove link ${i + 1}`}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => setLinks([...links, { label: "", url: "", icon: "link" }])}
            className="flex items-center gap-2 text-sm font-medium text-esm-red hover:opacity-80 transition-opacity py-1"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Add Link
          </button>
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
