"use client";

import { useState } from "react";

const DAY_OPTIONS = [
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
];

interface Result {
  generated: number;
  phases: string[];
  execMeetings: number;
}

export default function GenerateMeetingsButton({ projectId }: { projectId: string }) {
  const [open, setOpen] = useState(false);
  const [meetingDay, setMeetingDay] = useState(2);
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleGenerate() {
    setGenerating(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch(`/api/projects/${projectId}/generate-meetings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ meetingDay }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to generate meetings");
      }
      const data: Result = await res.json();
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate meetings");
    } finally {
      setGenerating(false);
    }
  }

  if (result) {
    return (
      <div className="bg-emerald-50 border border-emerald-200 rounded-sm p-4">
        <p className="text-sm font-medium text-emerald-800 mb-1">
          Generated {result.generated} meetings
        </p>
        <p className="text-xs text-emerald-700">
          Phases: {result.phases.join(" → ")}
          {result.execMeetings > 0 && (
            <span className="ml-2">· {result.execMeetings} exec-required</span>
          )}
        </p>
        <button
          onClick={() => { setResult(null); setOpen(false); }}
          className="mt-2 text-xs text-emerald-600 hover:underline"
        >
          Dismiss
        </button>
      </div>
    );
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full text-center bg-esm-black text-white text-sm font-medium py-2 rounded hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        Generate Meeting Schedule
      </button>
    );
  }

  return (
    <div className="bg-white border border-[#E2E0E1] rounded-sm p-4">
      <h3 className="text-xs font-bold text-esm-grey uppercase tracking-wider mb-3">
        Generate Meeting Schedule
      </h3>
      <p className="text-xs text-esm-grey mb-3">
        Creates weekly meetings from project start through hypercare with phase-appropriate agendas, SC prep items, and customer deliverables.
      </p>

      <label className="block text-xs font-medium text-esm-black mb-1">
        Weekly meeting day
      </label>
      <select
        value={meetingDay}
        onChange={(e) => setMeetingDay(Number(e.target.value))}
        className="w-full text-sm border border-[#E2E0E1] rounded px-3 py-1.5 mb-3 focus:outline-none focus:border-esm-black"
      >
        {DAY_OPTIONS.map((d) => (
          <option key={d.value} value={d.value}>{d.label}</option>
        ))}
      </select>

      {error && (
        <p className="text-xs text-esm-red mb-2">{error}</p>
      )}

      <div className="flex items-center gap-2">
        <button
          onClick={handleGenerate}
          disabled={generating}
          className="flex-1 text-center bg-esm-red text-white text-sm font-medium py-2 rounded hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {generating ? "Generating..." : "Generate"}
        </button>
        <button
          onClick={() => { setOpen(false); setError(null); }}
          className="px-3 py-2 text-sm text-esm-grey border border-[#E2E0E1] rounded hover:bg-slate-50 transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
