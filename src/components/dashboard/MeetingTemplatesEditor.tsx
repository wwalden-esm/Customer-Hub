"use client";

import { useState, useCallback } from "react";
import { Card } from "@/components/ui/Card";

interface Section {
  title: string;
  prompt: string;
}

interface Template {
  id: string;
  name: string;
  duration: number;
  sections: Section[];
}

export default function MeetingTemplatesEditor({ initialTemplates }: { initialTemplates: Template[] }) {
  const [templates, setTemplates] = useState<Template[]>(initialTemplates);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState<Template | null>(null);

  const startEdit = useCallback((t: Template) => {
    setEditingId(t.id);
    setDraft({ ...t, sections: t.sections.map((s) => ({ ...s })) });
  }, []);

  const startNew = useCallback(() => {
    const newTemplate: Template = {
      id: `custom-${Date.now()}`,
      name: "New Meeting Type",
      duration: 30,
      sections: [{ title: "Agenda Item", prompt: "Discussion points" }],
    };
    setDraft(newTemplate);
    setEditingId(newTemplate.id);
  }, []);

  const saveDraft = useCallback(async () => {
    if (!draft) return;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/meeting-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      if (res.ok) {
        setTemplates((prev) => {
          const idx = prev.findIndex((t) => t.id === draft.id);
          if (idx >= 0) {
            const next = [...prev];
            next[idx] = draft;
            return next;
          }
          return [...prev, draft];
        });
        setEditingId(null);
        setDraft(null);
      }
    } finally {
      setSaving(false);
    }
  }, [draft]);

  const addSection = useCallback(() => {
    if (!draft) return;
    setDraft({
      ...draft,
      sections: [...draft.sections, { title: "", prompt: "" }],
    });
  }, [draft]);

  const removeSection = useCallback((idx: number) => {
    if (!draft || draft.sections.length <= 1) return;
    setDraft({
      ...draft,
      sections: draft.sections.filter((_, i) => i !== idx),
    });
  }, [draft]);

  const updateSection = useCallback((idx: number, field: keyof Section, value: string) => {
    if (!draft) return;
    const sections = [...draft.sections];
    sections[idx] = { ...sections[idx], [field]: value };
    setDraft({ ...draft, sections });
  }, [draft]);

  if (draft && editingId) {
    return (
      <Card padding="md">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-esm-grey mb-1">Template Name</label>
              <input
                type="text"
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                className="w-full text-sm border border-esm-border rounded-card px-3 py-2 focus:outline-none focus:border-esm-black"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-esm-grey mb-1">Duration (minutes)</label>
              <input
                type="number"
                value={draft.duration}
                onChange={(e) => setDraft({ ...draft, duration: parseInt(e.target.value) || 30 })}
                className="w-full text-sm border border-esm-border rounded-card px-3 py-2 focus:outline-none focus:border-esm-black"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-esm-grey">Agenda Sections</label>
              <button
                onClick={addSection}
                className="text-xs font-medium px-2 py-1 rounded-card border border-esm-border hover:bg-gray-50"
              >
                + Add Section
              </button>
            </div>
            <div className="space-y-3">
              {draft.sections.map((section, i) => (
                <div key={i} className="flex gap-3 items-start bg-gray-50 rounded-card p-3">
                  <span className="text-xs text-esm-muted mt-2 w-5 shrink-0">{i + 1}.</span>
                  <div className="flex-1 space-y-2">
                    <input
                      type="text"
                      value={section.title}
                      onChange={(e) => updateSection(i, "title", e.target.value)}
                      placeholder="Section title"
                      className="w-full text-sm border border-esm-border rounded-card px-3 py-1.5 focus:outline-none focus:border-esm-black"
                    />
                    <input
                      type="text"
                      value={section.prompt}
                      onChange={(e) => updateSection(i, "prompt", e.target.value)}
                      placeholder="Recap prompt / description"
                      className="w-full text-xs border border-esm-border rounded-card px-3 py-1.5 focus:outline-none focus:border-esm-black text-esm-grey"
                    />
                  </div>
                  {draft.sections.length > 1 && (
                    <button
                      onClick={() => removeSection(i)}
                      className="text-esm-muted hover:text-esm-red mt-2"
                      aria-label="Remove section"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-2 justify-end pt-2 border-t border-esm-border">
            <button
              onClick={() => { setEditingId(null); setDraft(null); }}
              className="text-xs px-4 py-2 rounded-card border border-esm-border hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={saveDraft}
              disabled={saving || !draft.name.trim()}
              className="text-xs font-medium px-4 py-2 rounded-card text-white bg-esm-blue hover:opacity-90 disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save Template"}
            </button>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <div>
      <div className="flex justify-end mb-4">
        <button
          onClick={startNew}
          className="inline-flex items-center gap-1.5 text-xs font-medium px-4 py-2 rounded-card text-white bg-esm-blue hover:opacity-90"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          New Template
        </button>
      </div>

      {templates.length === 0 ? (
        <Card padding="lg" className="text-center !py-12">
          <p className="text-sm text-esm-grey">No meeting templates configured.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {templates.map((t) => (
            <Card key={t.id} padding="md">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-sm font-bold text-esm-black">{t.name}</h3>
                  <p className="text-xs text-esm-muted mt-0.5">{t.duration} min · {t.sections.length} section{t.sections.length !== 1 ? "s" : ""}</p>
                </div>
                <button
                  onClick={() => startEdit(t)}
                  className="text-xs font-medium px-3 py-1 rounded-card border border-esm-border hover:bg-gray-50"
                >
                  Edit
                </button>
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {t.sections.map((s, i) => (
                  <span key={i} className="text-[10px] bg-gray-100 text-esm-grey rounded-card px-2 py-0.5">
                    {s.title}
                  </span>
                ))}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
