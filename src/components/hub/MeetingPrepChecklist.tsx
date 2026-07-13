"use client";

import { useState, useEffect } from "react";

const STORAGE_KEY = "hub-meeting-prep";

interface MeetingPrepChecklistProps {
  meetingId: string;
  deliverables: string;
}

function parseDeliverables(text: string): string[] {
  return text
    .split(/[;\n]/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

export default function MeetingPrepChecklist({ meetingId, deliverables }: MeetingPrepChecklistProps) {
  const items = parseDeliverables(deliverables);
  const [checked, setChecked] = useState<Set<number>>(new Set());

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const data = JSON.parse(raw);
        const saved = data[meetingId];
        if (Array.isArray(saved)) setChecked(new Set(saved));
      }
    } catch { /* ignore */ }
  }, [meetingId]);

  function toggle(index: number) {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);

      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        const data = raw ? JSON.parse(raw) : {};
        data[meetingId] = Array.from(next);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      } catch { /* ignore */ }

      return next;
    });
  }

  if (items.length === 0) return null;

  const allDone = items.length > 0 && checked.size >= items.length;

  return (
    <div className="mt-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-card">
      <div className="flex items-center justify-between mb-1.5">
        <p className="text-[10px] font-bold text-amber-700 uppercase tracking-wider">Your Prep Checklist</p>
        {allDone && (
          <span className="text-[10px] font-bold text-emerald-600">All done!</span>
        )}
      </div>
      <ul className="space-y-1">
        {items.map((item, i) => (
          <li key={i}>
            <label className="flex items-start gap-2 cursor-pointer group">
              <input
                type="checkbox"
                checked={checked.has(i)}
                onChange={() => toggle(i)}
                className="mt-0.5 rounded accent-amber-600"
              />
              <span className={`text-xs leading-relaxed ${checked.has(i) ? "text-amber-600 line-through" : "text-amber-800"}`}>
                {item}
              </span>
            </label>
          </li>
        ))}
      </ul>
    </div>
  );
}
