"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";

interface MeetingSection {
  title: string;
  prompt: string;
}

interface MeetingTemplate {
  id: string;
  name: string;
  duration: number;
  sections: MeetingSection[];
}

export default function MeetingGuideCards({
  templates,
}: {
  templates: MeetingTemplate[];
}) {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  async function copyAgenda(template: MeetingTemplate) {
    const lines = [
      template.name,
      `Duration: ${template.duration} minutes`,
      "",
      "Agenda:",
      ...template.sections.map(
        (s, i) => `${i + 1}. ${s.title} - ${s.prompt}`,
      ),
    ];
    const text = lines.join("\n");

    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(template.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      // Fallback for insecure context
      const el = document.createElement("textarea");
      el.value = text;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      setCopiedId(template.id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  }

  if (templates.length === 0) {
    return (
      <Card>
        <p className="text-sm text-esm-muted py-4 text-center">
          No meeting templates configured
        </p>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {templates.map((template) => (
        <Card key={template.id}>
          <div className="flex items-start justify-between mb-3">
            <div>
              <h2 className="text-lg font-semibold text-esm-black">
                {template.name}
              </h2>
              <p className="text-sm text-esm-muted mt-0.5">
                {template.duration} minutes
              </p>
            </div>
            <button
              onClick={() => copyAgenda(template)}
              className={`shrink-0 px-3 py-1.5 text-xs font-medium rounded border transition-colors ${
                copiedId === template.id
                  ? "bg-green-50 text-green-700 border-green-200"
                  : "bg-white text-esm-black border-esm-border hover:bg-gray-50"
              }`}
            >
              {copiedId === template.id ? "Copied!" : "Copy agenda"}
            </button>
          </div>

          <div className="space-y-3">
            {template.sections.map((section, i) => (
              <div
                key={i}
                className="border-l-2 border-esm-border pl-3 py-1"
              >
                <p className="text-sm font-medium text-esm-black">
                  {i + 1}. {section.title}
                </p>
                <p className="text-xs text-esm-muted mt-0.5">
                  {section.prompt}
                </p>
              </div>
            ))}
          </div>
        </Card>
      ))}
    </div>
  );
}
