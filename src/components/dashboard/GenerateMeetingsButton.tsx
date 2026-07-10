"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card, SectionLabel } from "@/components/ui";

const DAY_OPTIONS = [
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
];

const TIME_OPTIONS = [
  { value: "08:00", label: "8:00 AM" },
  { value: "08:30", label: "8:30 AM" },
  { value: "09:00", label: "9:00 AM" },
  { value: "09:30", label: "9:30 AM" },
  { value: "10:00", label: "10:00 AM" },
  { value: "10:30", label: "10:30 AM" },
  { value: "11:00", label: "11:00 AM" },
  { value: "11:30", label: "11:30 AM" },
  { value: "12:00", label: "12:00 PM" },
  { value: "12:30", label: "12:30 PM" },
  { value: "13:00", label: "1:00 PM" },
  { value: "13:30", label: "1:30 PM" },
  { value: "14:00", label: "2:00 PM" },
  { value: "14:30", label: "2:30 PM" },
  { value: "15:00", label: "3:00 PM" },
  { value: "15:30", label: "3:30 PM" },
  { value: "16:00", label: "4:00 PM" },
  { value: "16:30", label: "4:30 PM" },
  { value: "17:00", label: "5:00 PM" },
];

interface Result {
  generated: number;
  phases: string[];
  execMeetings: number;
}

export default function GenerateMeetingsButton({ projectId }: { projectId: string }) {
  const [open, setOpen] = useState(false);
  const [meetingDay, setMeetingDay] = useState(2);
  const [meetingTime, setMeetingTime] = useState("14:30");
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
        body: JSON.stringify({ meetingDay, meetingTime }),
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
      <div className="bg-emerald-50 border border-emerald-200 rounded-card p-4">
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
    <Card padding="sm">
      <SectionLabel className="mb-3">
        Generate Meeting Schedule
      </SectionLabel>
      <p className="text-xs text-esm-grey mb-3">
        Creates weekly meetings from project start through hypercare with phase-appropriate agendas, SC prep items, and customer deliverables.
      </p>

      <div className="grid grid-cols-2 gap-2 mb-3">
        <div>
          <label className="block text-xs font-medium text-esm-black mb-1">Day</label>
          <select
            value={meetingDay}
            onChange={(e) => setMeetingDay(Number(e.target.value))}
            className="w-full text-sm border border-esm-border rounded px-3 py-1.5 focus:outline-none focus:border-esm-black"
          >
            {DAY_OPTIONS.map((d) => (
              <option key={d.value} value={d.value}>{d.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-esm-black mb-1">Time (EST)</label>
          <select
            value={meetingTime}
            onChange={(e) => setMeetingTime(e.target.value)}
            className="w-full text-sm border border-esm-border rounded px-3 py-1.5 focus:outline-none focus:border-esm-black"
          >
            {TIME_OPTIONS.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <p className="text-xs text-esm-red mb-2">{error}</p>
      )}

      <div className="flex items-center gap-2">
        <Button
          onClick={handleGenerate}
          disabled={generating}
          variant="primary"
          size="md"
          className="flex-1"
        >
          {generating ? "Generating..." : "Generate"}
        </Button>
        <Button
          onClick={() => { setOpen(false); setError(null); }}
          variant="secondary"
          size="md"
        >
          Cancel
        </Button>
      </div>
    </Card>
  );
}
