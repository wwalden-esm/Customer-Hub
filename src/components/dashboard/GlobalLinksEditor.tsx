"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { SectionLabel, Card } from "@/components/ui";

interface LinkItem {
  label: string;
  url: string;
  icon?: string;
}

export default function GlobalLinksEditor({ initialLinks }: { initialLinks: LinkItem[] }) {
  const [links, setLinks] = useState<LinkItem[]>(initialLinks);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ globalLinks: links.filter((l) => l.label.trim() && l.url.trim()) }),
      });
      if (res.ok) setSaved(true);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card padding="md">
      <div className="flex items-center justify-between mb-1">
        <SectionLabel>Global Customer Links</SectionLabel>
      </div>
      <p className="text-xs text-esm-grey mb-4">These links appear on every customer hub. Use for company-wide resources like support portals, knowledge bases, or training sites.</p>
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
                    setSaved(false);
                  }}
                  placeholder="Label"
                  className="flex-1 border border-esm-border rounded px-3 py-1.5 text-sm"
                  aria-label={`Global link ${i + 1} label`}
                />
                <select
                  value={link.icon || "link"}
                  onChange={(e) => {
                    const updated = [...links];
                    updated[i] = { ...updated[i], icon: e.target.value };
                    setLinks(updated);
                    setSaved(false);
                  }}
                  className="border border-esm-border rounded px-2 py-1.5 text-sm w-32"
                  aria-label={`Global link ${i + 1} icon`}
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
                  setSaved(false);
                }}
                placeholder="https://..."
                className="w-full border border-esm-border rounded px-3 py-1.5 text-sm font-mono"
                aria-label={`Global link ${i + 1} URL`}
              />
            </div>
            <button
              type="button"
              onClick={() => { setLinks(links.filter((_, j) => j !== i)); setSaved(false); }}
              className="mt-1 p-1.5 text-slate-400 hover:text-esm-red transition-colors rounded hover:bg-red-50"
              aria-label={`Remove global link ${i + 1}`}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => { setLinks([...links, { label: "", url: "", icon: "link" }]); setSaved(false); }}
          className="flex items-center gap-2 text-sm font-medium text-esm-red hover:opacity-80 transition-opacity py-1"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Add Link
        </button>
      </div>
      <div className="flex items-center gap-3 mt-4 pt-4 border-t border-gray-100">
        <Button
          onClick={handleSave}
          disabled={saving}
          variant="primary"
          size="sm"
          className="text-sm"
        >
          {saving ? "Saving..." : "Save Global Links"}
        </Button>
        {saved && <span className="text-sm text-emerald-600">Saved</span>}
      </div>
    </Card>
  );
}
