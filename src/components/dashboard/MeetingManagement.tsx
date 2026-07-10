"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { parseLocalDate } from "@/lib/date-utils";

interface Meeting {
  id: string;
  week: string;
  days: string;
  phase: string;
  milestone: string;
  meetingDate: string | null;
  status: string;
  scPrepItems: string;
  agendaSummary: string;
  customerDeliverables: string;
  notes: string;
  actionItemsLogged: boolean;
  recapSent: boolean;
  recapAttachmentId: number | null;
}

interface ActionItemDraft {
  description: string;
  owner: string;
  dueDate: string;
}

interface TranscriptResult {
  recap: {
    meeting_name: string;
    attendees: string;
    summary: string;
    action_items: { owner: string; task: string; due: string; type: string }[];
    decisions: { title: string; description: string; made_by: string; type: string; impact: string }[];
    risks: { description: string; owner: string; mitigation: string; priority: string }[];
  };
  raidItemsLogged: number;
  actionItemsLogged: number;
  decisionsLogged: number;
  risksLogged: number;
  emlContent: string;
  meetingWeek: string;
  recapAttachmentId: number | null;
}

const STATUS_COLORS: Record<string, string> = {
  Upcoming: "bg-amber-100 text-amber-700",
  Scheduled: "bg-blue-100 text-blue-700",
  Complete: "bg-green-100 text-green-700",
  Skipped: "bg-gray-100 text-gray-500",
};

function fmtDate(d: string | null): string {
  if (!d) return "—";
  return parseLocalDate(d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function MeetingManagement({
  meetings: initialMeetings,
  projectId,
}: {
  meetings: Meeting[];
  projectId: string;
}) {
  const [meetings, setMeetings] = useState(initialMeetings);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [activePanel, setActivePanel] = useState<{ id: string; type: "transcript" | "manual-actions" | "manual-recap" | "view-recap" } | null>(null);
  const [filter, setFilter] = useState<"all" | "needs-action">("needs-action");

  const isPastMeeting = (m: Meeting) => {
    if (!m.meetingDate) return false;
    const d = parseLocalDate(m.meetingDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return d <= today;
  };

  const needsActionFilter = (m: Meeting) =>
    m.status !== "Skipped" && isPastMeeting(m) && (!m.actionItemsLogged || !m.recapSent);

  const filtered = useMemo(() => {
    if (filter === "needs-action") return meetings.filter(needsActionFilter);
    return meetings;
  }, [meetings, filter]);

  const needsAction = meetings.filter(needsActionFilter).length;

  const toggle = (id: string) => {
    setExpanded((prev) => (prev === id ? null : id));
    setActivePanel(null);
  };

  const openPanel = (id: string, type: "transcript" | "manual-actions" | "manual-recap" | "view-recap") => {
    setActivePanel(activePanel?.id === id && activePanel?.type === type ? null : { id, type });
  };

  const markBoth = (id: string, recapAttachmentId?: number | null) => {
    setMeetings((prev) =>
      prev.map((m) => (m.id === id ? { ...m, actionItemsLogged: true, recapSent: true, status: "Complete", recapAttachmentId: recapAttachmentId ?? m.recapAttachmentId } : m)),
    );
    setActivePanel(null);
  };

  const markActionItems = (id: string) => {
    setMeetings((prev) =>
      prev.map((m) => (m.id === id ? { ...m, actionItemsLogged: true } : m)),
    );
    setActivePanel(null);
  };

  const markRecapSent = (id: string) => {
    setMeetings((prev) =>
      prev.map((m) => (m.id === id ? { ...m, recapSent: true } : m)),
    );
    setActivePanel(null);
  };

  const [showAddForm, setShowAddForm] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState<string | null>(null);

  const updateStatus = async (id: string, newStatus: Meeting["status"]) => {
    setStatusUpdating(id);
    try {
      const res = await fetch(`/api/projects/${projectId}/meetings/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) return;
      const data = await res.json();
      const shifted: Record<string, string> = data.shiftedDates ?? {};
      const promoted: string | null = data.promotedId ?? null;
      setMeetings((prev) =>
        prev.map((m) => {
          const newDate = shifted[m.id];
          if (m.id === id) return { ...m, status: newStatus, meetingDate: newDate ?? m.meetingDate };
          if (m.id === promoted) return { ...m, status: "Upcoming" as Meeting["status"] };
          if (newDate) return { ...m, meetingDate: newDate };
          return m;
        }),
      );
    } finally {
      setStatusUpdating(null);
    }
  };

  return (
    <>
      <div className="flex items-center gap-3 mb-5">
        <button
          onClick={() => setFilter("needs-action")}
          className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
            filter === "needs-action"
              ? "bg-amber-100 text-amber-800"
              : "bg-gray-100 text-esm-grey hover:bg-gray-200"
          }`}
        >
          Needs Action ({needsAction})
        </button>
        <button
          onClick={() => setFilter("all")}
          className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
            filter === "all"
              ? "bg-esm-black text-white"
              : "bg-gray-100 text-esm-grey hover:bg-gray-200"
          }`}
        >
          All Meetings ({meetings.length})
        </button>
        <div className="flex-1" />
        <button
          onClick={() => setShowAddForm((p) => !p)}
          className="px-3 py-1.5 text-xs font-medium bg-esm-red text-white rounded hover:opacity-90 transition-opacity flex items-center gap-1.5"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Add Meeting
        </button>
      </div>

      {showAddForm && (
        <AddMeetingPanel
          projectId={projectId}
          onAdded={(m) => {
            setMeetings((prev) => [...prev, m]);
            setShowAddForm(false);
          }}
          onCancel={() => setShowAddForm(false)}
        />
      )}

      {filtered.length === 0 ? (
        <div className="bg-white rounded-sm border border-[#E2E0E1] px-6 py-8 text-center">
          <p className="text-sm text-slate-500">
            {filter === "needs-action"
              ? "All completed meetings have action items logged and recaps sent."
              : "No meetings found."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((meeting) => {
            const isExpanded = expanded === meeting.id;
            const panel = activePanel?.id === meeting.id ? activePanel.type : null;

            return (
              <div key={meeting.id} className="bg-white rounded-sm border border-[#E2E0E1]">
                <button
                  onClick={() => toggle(meeting.id)}
                  className="w-full text-left px-5 py-4 flex items-center gap-4"
                >
                  <svg
                    className={`w-4 h-4 text-[#9E9B9E] shrink-0 transition-transform ${isExpanded ? "rotate-90" : ""}`}
                    fill="none" viewBox="0 0 24 24" stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-esm-black">{meeting.week}</span>
                      <span className="text-xs text-esm-grey">{meeting.phase}</span>
                      <span className="text-xs text-esm-grey">{fmtDate(meeting.meetingDate)}</span>
                      <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${STATUS_COLORS[meeting.status] ?? "bg-gray-100 text-gray-700"}`}>
                        {meeting.status}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <StatusBadge done={meeting.actionItemsLogged} label="Action Items" />
                    <StatusBadge done={meeting.recapSent} label="Recap" />
                  </div>
                </button>

                {isExpanded && (
                  <div className="border-t border-[#E2E0E1] px-5 py-4 space-y-4">
                    {meeting.agendaSummary && (
                      <div className="pl-4 border-l-2 border-[#E2E0E1]">
                        <p className="text-[10px] font-extrabold text-esm-grey tracking-[0.09em] uppercase mb-1">Agenda</p>
                        <p className="text-sm text-esm-black whitespace-pre-wrap">{meeting.agendaSummary}</p>
                      </div>
                    )}

                    {/* Status override buttons */}
                    {meeting.status !== "Complete" && meeting.status !== "Skipped" && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-esm-grey mr-1">Mark as:</span>
                        <button
                          onClick={() => updateStatus(meeting.id, "Complete")}
                          disabled={statusUpdating === meeting.id}
                          className="px-3 py-1 text-xs font-medium border border-green-300 text-green-700 rounded hover:bg-green-50 transition-colors disabled:opacity-50"
                        >
                          Complete
                        </button>
                        <button
                          onClick={() => updateStatus(meeting.id, "Skipped")}
                          disabled={statusUpdating === meeting.id}
                          className="px-3 py-1 text-xs font-medium border border-gray-300 text-gray-500 rounded hover:bg-gray-50 transition-colors disabled:opacity-50"
                        >
                          Skipped
                        </button>
                      </div>
                    )}
                    {(meeting.status === "Complete" || meeting.status === "Skipped") && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-esm-grey mr-1">Status:</span>
                        <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${STATUS_COLORS[meeting.status]}`}>{meeting.status}</span>
                        <button
                          onClick={() => updateStatus(meeting.id, "Upcoming")}
                          disabled={statusUpdating === meeting.id}
                          className="px-3 py-1 text-xs font-medium border border-[#E2E0E1] text-esm-grey rounded hover:bg-slate-50 transition-colors disabled:opacity-50"
                        >
                          Revert to Upcoming
                        </button>
                      </div>
                    )}

                    {/* View existing recap */}
                    {meeting.recapAttachmentId && (
                      <button
                        onClick={() => openPanel(meeting.id, "view-recap")}
                        className={`px-4 py-2 text-sm font-medium rounded transition-opacity flex items-center gap-2 ${
                          panel === "view-recap"
                            ? "bg-esm-blue/90 text-white"
                            : "bg-esm-blue text-white hover:opacity-90"
                        }`}
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        View Recap
                      </button>
                    )}

                    {/* Primary action: Process Transcript (handles both action items + recap) */}
                    {(!meeting.actionItemsLogged || !meeting.recapSent) && (
                      <div className="flex flex-wrap gap-3">
                        <button
                          onClick={() => openPanel(meeting.id, "transcript")}
                          className={`px-4 py-2 text-sm font-medium rounded transition-opacity flex items-center gap-2 ${
                            panel === "transcript"
                              ? "bg-esm-red/90 text-white"
                              : "bg-esm-red text-white hover:opacity-90"
                          }`}
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          Process Transcript
                        </button>

                        {!meeting.actionItemsLogged && (
                          <button
                            onClick={() => openPanel(meeting.id, "manual-actions")}
                            className="px-4 py-2 text-sm font-medium border border-[#E2E0E1] text-esm-grey rounded hover:bg-slate-50 transition-colors"
                          >
                            Log Action Items Manually
                          </button>
                        )}

                        {!meeting.recapSent && (
                          <button
                            onClick={() => openPanel(meeting.id, "manual-recap")}
                            className="px-4 py-2 text-sm font-medium border border-[#E2E0E1] text-esm-grey rounded hover:bg-slate-50 transition-colors"
                          >
                            Send Recap Manually
                          </button>
                        )}
                      </div>
                    )}

                    {panel === "transcript" && (
                      <ProcessTranscriptPanel
                        meetingId={meeting.id}
                        projectId={projectId}
                        meeting={meeting}
                        onDone={(attachmentId) => markBoth(meeting.id, attachmentId)}
                        onRecapOpened={() => markRecapSent(meeting.id)}
                      />
                    )}

                    {panel === "manual-actions" && (
                      <LogActionItemsPanel
                        meetingId={meeting.id}
                        projectId={projectId}
                        onDone={() => markActionItems(meeting.id)}
                      />
                    )}

                    {panel === "manual-recap" && (
                      <SendRecapPanel
                        meetingId={meeting.id}
                        projectId={projectId}
                        meeting={meeting}
                        onDone={() => markRecapSent(meeting.id)}
                      />
                    )}

                    {panel === "view-recap" && (
                      <ViewRecapPanel meetingId={meeting.id} projectId={projectId} />
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}

function StatusBadge({ done, label }: { done: boolean; label: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full ${
        done ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
      }`}
    >
      {done ? (
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      ) : (
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )}
      {label}
    </span>
  );
}

// --- Process Transcript Panel (primary flow) ---

function ProcessTranscriptPanel({
  meetingId,
  projectId,
  meeting,
  onDone,
  onRecapOpened,
}: {
  meetingId: string;
  projectId: string;
  meeting: Meeting;
  onDone: (recapAttachmentId?: number | null) => void;
  onRecapOpened: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [transcript, setTranscript] = useState("");
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<TranscriptResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setTranscript(reader.result as string);
    reader.readAsText(file);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setTranscript(reader.result as string);
    reader.readAsText(file);
  }

  async function handleProcess() {
    if (!transcript.trim()) {
      setError("Paste or drop a transcript first");
      return;
    }
    setProcessing(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/projects/${projectId}/meetings/${meetingId}/process-transcript`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ transcript }),
        },
      );
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to process transcript");
      }
      const data: TranscriptResult = await res.json();
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Processing failed");
    } finally {
      setProcessing(false);
    }
  }

  function openRecapInOutlook() {
    if (!result) return;
    const blob = new Blob([result.emlContent], { type: "message/rfc822" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Recap-${result.meetingWeek.replace(/\s+/g, "-")}.eml`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    fetch(`/api/projects/${projectId}/meetings/${meetingId}/mark-recap`, { method: "POST" });
    onRecapOpened();
  }

  if (result) {
    const r = result.recap;
    return (
      <div className="bg-slate-50 border border-[#E2E0E1] rounded-sm p-4 space-y-4">
        <div className="flex items-center gap-3">
          <svg className="w-5 h-5 text-green-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <h4 className="text-sm font-semibold text-esm-black">{r.meeting_name}</h4>
            <p className="text-xs text-esm-grey">Processed — RAID items pushed to Smartsheet</p>
          </div>
        </div>

        {/* Summary stats */}
        <div className="grid grid-cols-4 gap-2">
          <div className="bg-white rounded border border-[#E2E0E1] px-3 py-2 text-center">
            <p className="text-lg font-bold text-esm-black">{result.actionItemsLogged}</p>
            <p className="text-[10px] text-esm-grey uppercase tracking-wider">Actions</p>
          </div>
          <div className="bg-white rounded border border-[#E2E0E1] px-3 py-2 text-center">
            <p className="text-lg font-bold text-esm-black">{result.decisionsLogged}</p>
            <p className="text-[10px] text-esm-grey uppercase tracking-wider">Decisions</p>
          </div>
          <div className="bg-white rounded border border-[#E2E0E1] px-3 py-2 text-center">
            <p className="text-lg font-bold text-esm-black">{result.risksLogged}</p>
            <p className="text-[10px] text-esm-grey uppercase tracking-wider">Risks</p>
          </div>
          <div className="bg-white rounded border border-[#E2E0E1] px-3 py-2 text-center">
            <p className="text-lg font-bold text-esm-black">{result.raidItemsLogged}</p>
            <p className="text-[10px] text-esm-grey uppercase tracking-wider">RAID Total</p>
          </div>
        </div>

        {/* Recap preview */}
        <div className="pl-4 border-l-2 border-[#E2E0E1]">
          <p className="text-[10px] font-extrabold text-esm-grey tracking-[0.09em] uppercase mb-1">Summary</p>
          <p className="text-sm text-esm-black">{r.summary}</p>
        </div>

        {r.action_items.length > 0 && (
          <div className="pl-4 border-l-2 border-amber-200">
            <p className="text-[10px] font-extrabold text-amber-600 tracking-[0.09em] uppercase mb-1">Action Items</p>
            <ul className="space-y-1">
              {r.action_items.map((ai, i) => (
                <li key={i} className="text-xs text-esm-black">
                  <span className="font-medium">{ai.owner}:</span> {ai.task}
                  <span className="text-esm-grey ml-1">(Due: {ai.due}, {ai.type})</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {r.decisions.length > 0 && (
          <div className="pl-4 border-l-2 border-blue-200">
            <p className="text-[10px] font-extrabold text-blue-600 tracking-[0.09em] uppercase mb-1">Decisions</p>
            <ul className="space-y-1">
              {r.decisions.map((d, i) => (
                <li key={i} className="text-xs text-esm-black">
                  <span className="font-medium">{d.title}:</span> {d.description}
                </li>
              ))}
            </ul>
          </div>
        )}

        {r.risks.length > 0 && (
          <div className="pl-4 border-l-2 border-red-200">
            <p className="text-[10px] font-extrabold text-red-600 tracking-[0.09em] uppercase mb-1">Risks / Open Items</p>
            <ul className="space-y-1">
              {r.risks.map((risk, i) => (
                <li key={i} className="text-xs text-esm-black">
                  {risk.description}
                  <span className="text-esm-grey ml-1">({risk.priority})</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 pt-2 border-t border-[#E2E0E1]">
          <button
            onClick={openRecapInOutlook}
            className="px-4 py-2 text-sm font-medium bg-esm-red text-white rounded hover:opacity-90 transition-opacity flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            Open Recap in Outlook
          </button>
          <button
            onClick={() => onDone(result.recapAttachmentId)}
            className="px-4 py-2 text-sm font-medium border border-[#E2E0E1] text-esm-grey rounded hover:bg-slate-50 transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-50 border border-[#E2E0E1] rounded-sm p-4 space-y-3">
      <h4 className="text-xs font-bold text-esm-grey uppercase tracking-wider">
        Process Meeting Transcript
      </h4>
      <p className="text-xs text-esm-grey">
        Drop or paste a transcript (.srt, .vtt, or text). Claude will extract the recap,
        action items, decisions, and risks — then push RAID items to Smartsheet and open the
        recap email in Outlook for review.
      </p>

      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        className="border-2 border-dashed border-[#E2E0E1] rounded px-4 py-6 text-center hover:border-esm-black/30 transition-colors cursor-pointer"
        onClick={() => fileRef.current?.click()}
      >
        <input
          ref={fileRef}
          type="file"
          accept=".srt,.vtt,.txt,.docx"
          className="hidden"
          onChange={handleFileSelect}
        />
        {transcript ? (
          <div>
            <p className="text-sm font-medium text-esm-black">
              Transcript loaded ({Math.round(transcript.length / 1024)}KB)
            </p>
            <p className="text-xs text-esm-grey mt-1">Click or drop to replace</p>
          </div>
        ) : (
          <div>
            <svg className="w-8 h-8 mx-auto text-slate-300 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <p className="text-sm text-esm-grey">Drop transcript file here or click to browse</p>
            <p className="text-xs text-[#9E9B9E] mt-1">.srt, .vtt, .txt, .docx</p>
          </div>
        )}
      </div>

      <div>
        <label className="block text-xs font-medium text-esm-black mb-1">
          Or paste transcript text
        </label>
        <textarea
          rows={4}
          placeholder="Paste meeting transcript here..."
          value={transcript}
          onChange={(e) => setTranscript(e.target.value)}
          className="w-full text-sm border border-[#E2E0E1] rounded px-3 py-2 focus:outline-none focus:border-esm-black resize-y font-mono text-xs"
        />
      </div>

      {error && <p className="text-xs text-esm-red">{error}</p>}

      <button
        onClick={handleProcess}
        disabled={processing || !transcript.trim()}
        className="px-4 py-2 text-sm font-medium bg-esm-red text-white rounded hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-2"
      >
        {processing ? (
          <>
            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Processing with Claude...
          </>
        ) : (
          "Process Transcript"
        )}
      </button>
    </div>
  );
}

// --- Manual Action Items Panel (fallback) ---

function LogActionItemsPanel({
  meetingId,
  projectId,
  onDone,
}: {
  meetingId: string;
  projectId: string;
  onDone: () => void;
}) {
  const [items, setItems] = useState<ActionItemDraft[]>([
    { description: "", owner: "", dueDate: "" },
  ]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addRow = () =>
    setItems((prev) => [...prev, { description: "", owner: "", dueDate: "" }]);

  const updateItem = (idx: number, field: keyof ActionItemDraft, value: string) =>
    setItems((prev) =>
      prev.map((item, i) => (i === idx ? { ...item, [field]: value } : item)),
    );

  const removeItem = (idx: number) =>
    setItems((prev) => prev.filter((_, i) => i !== idx));

  async function handleSave() {
    const valid = items.filter((i) => i.description.trim());
    if (valid.length === 0) {
      setError("Add at least one action item");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/projects/${projectId}/meetings/${meetingId}/log-actions`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ items: valid }),
        },
      );
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to log action items");
      }
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="bg-slate-50 border border-[#E2E0E1] rounded-sm p-4 space-y-3">
      <h4 className="text-xs font-bold text-esm-grey uppercase tracking-wider">
        Log Action Items Manually
      </h4>
      {items.map((item, idx) => (
        <div key={idx} className="grid grid-cols-[1fr_150px_140px_32px] gap-2 items-start">
          <input
            type="text"
            placeholder="Action item description"
            value={item.description}
            onChange={(e) => updateItem(idx, "description", e.target.value)}
            className="text-sm border border-[#E2E0E1] rounded px-3 py-1.5 focus:outline-none focus:border-esm-black"
          />
          <input
            type="text"
            placeholder="Owner"
            value={item.owner}
            onChange={(e) => updateItem(idx, "owner", e.target.value)}
            className="text-sm border border-[#E2E0E1] rounded px-3 py-1.5 focus:outline-none focus:border-esm-black"
          />
          <input
            type="date"
            value={item.dueDate}
            onChange={(e) => updateItem(idx, "dueDate", e.target.value)}
            className="text-sm border border-[#E2E0E1] rounded px-3 py-1.5 focus:outline-none focus:border-esm-black"
          />
          <button
            onClick={() => removeItem(idx)}
            disabled={items.length === 1}
            className="p-1.5 text-slate-400 hover:text-red-500 disabled:opacity-30"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      ))}
      <button onClick={addRow} className="text-xs text-esm-blue hover:underline">
        + Add another
      </button>
      {error && <p className="text-xs text-esm-red">{error}</p>}
      <div className="flex gap-2 pt-1">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-2 text-sm font-medium bg-esm-black text-white rounded hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save Action Items"}
        </button>
      </div>
    </div>
  );
}

// --- Manual Recap Panel (fallback) ---

function SendRecapPanel({
  meetingId,
  projectId,
  meeting,
  onDone,
}: {
  meetingId: string;
  projectId: string;
  meeting: Meeting;
  onDone: () => void;
}) {
  const [actionItems, setActionItems] = useState("");
  const [notes, setNotes] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSend() {
    setSending(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/projects/${projectId}/meetings/${meetingId}/send-recap`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ actionItems, notes }),
        },
      );
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to send recap");
      }
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="bg-slate-50 border border-[#E2E0E1] rounded-sm p-4 space-y-3">
      <h4 className="text-xs font-bold text-esm-grey uppercase tracking-wider">
        Send Meeting Recap
      </h4>
      <p className="text-xs text-esm-grey">
        Sends a recap email to all customer contacts and the SC/PM. The email includes
        the meeting agenda, deliverables, and any notes you add below.
      </p>

      <div>
        <label className="block text-xs font-medium text-esm-black mb-1">Action Items Summary</label>
        <textarea
          rows={3}
          placeholder="Summarize action items discussed"
          value={actionItems}
          onChange={(e) => setActionItems(e.target.value)}
          className="w-full text-sm border border-[#E2E0E1] rounded px-3 py-2 focus:outline-none focus:border-esm-black resize-y"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-esm-black mb-1">Additional Notes</label>
        <textarea
          rows={2}
          placeholder="Any additional context for the recap"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="w-full text-sm border border-[#E2E0E1] rounded px-3 py-2 focus:outline-none focus:border-esm-black resize-y"
        />
      </div>

      {error && <p className="text-xs text-esm-red">{error}</p>}

      <div className="flex gap-2 pt-1">
        <button
          onClick={handleSend}
          disabled={sending}
          className="px-4 py-2 text-sm font-medium bg-esm-red text-white rounded hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {sending ? "Sending..." : "Send Recap Email"}
        </button>
      </div>
    </div>
  );
}

// --- View Recap Panel ---

interface RecapData {
  meeting_name: string;
  attendees: string;
  summary: string;
  action_items: { owner: string; task: string; due: string; type: string }[];
  decisions: { title: string; description: string; made_by: string; type: string; impact: string }[];
  risks: { description: string; owner: string; mitigation: string; priority: string }[];
}

function ViewRecapPanel({ meetingId, projectId }: { meetingId: string; projectId: string }) {
  const [recap, setRecap] = useState<RecapData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/projects/${projectId}/meetings/${meetingId}/recap`)
      .then(async (res) => {
        if (!res.ok) throw new Error("Failed to load recap");
        const data = await res.json();
        setRecap(data.recap);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, [projectId, meetingId]);

  if (loading) {
    return (
      <div className="bg-slate-50 border border-[#E2E0E1] rounded-sm p-6 text-center">
        <svg className="w-5 h-5 animate-spin mx-auto text-esm-grey mb-2" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        <p className="text-xs text-esm-grey">Loading recap...</p>
      </div>
    );
  }

  if (error || !recap) {
    return (
      <div className="bg-slate-50 border border-[#E2E0E1] rounded-sm p-4">
        <p className="text-xs text-esm-red">{error || "Recap not found"}</p>
      </div>
    );
  }

  return (
    <div className="bg-slate-50 border border-[#E2E0E1] rounded-sm p-4 space-y-4">
      <div className="flex items-center gap-3">
        <svg className="w-5 h-5 text-esm-blue shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <div>
          <h4 className="text-sm font-semibold text-esm-black">{recap.meeting_name}</h4>
          <p className="text-xs text-esm-grey">{recap.attendees}</p>
        </div>
      </div>

      <div className="pl-4 border-l-2 border-[#E2E0E1]">
        <p className="text-[10px] font-extrabold text-esm-grey tracking-[0.09em] uppercase mb-1">Summary</p>
        <p className="text-sm text-esm-black">{recap.summary}</p>
      </div>

      {recap.action_items.length > 0 && (
        <div className="pl-4 border-l-2 border-amber-200">
          <p className="text-[10px] font-extrabold text-amber-600 tracking-[0.09em] uppercase mb-1">Action Items</p>
          <ul className="space-y-1">
            {recap.action_items.map((ai, i) => (
              <li key={i} className="text-xs text-esm-black">
                <span className="font-medium">{ai.owner}:</span> {ai.task}
                <span className="text-esm-grey ml-1">(Due: {ai.due}, {ai.type})</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {recap.decisions.length > 0 && (
        <div className="pl-4 border-l-2 border-blue-200">
          <p className="text-[10px] font-extrabold text-blue-600 tracking-[0.09em] uppercase mb-1">Decisions</p>
          <ul className="space-y-1">
            {recap.decisions.map((d, i) => (
              <li key={i} className="text-xs text-esm-black">
                <span className="font-medium">{d.title}:</span> {d.description}
              </li>
            ))}
          </ul>
        </div>
      )}

      {recap.risks.length > 0 && (
        <div className="pl-4 border-l-2 border-red-200">
          <p className="text-[10px] font-extrabold text-red-600 tracking-[0.09em] uppercase mb-1">Risks / Open Items</p>
          <ul className="space-y-1">
            {recap.risks.map((r, i) => (
              <li key={i} className="text-xs text-esm-black">
                {r.description}
                <span className="text-esm-grey ml-1">({r.priority})</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// --- Add Ad-Hoc Meeting Panel ---

const TIME_OPTIONS = [
  { value: "", label: "No time" },
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

function AddMeetingPanel({
  projectId,
  onAdded,
  onCancel,
}: {
  projectId: string;
  onAdded: (m: Meeting) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState("");
  const [meetingDate, setMeetingDate] = useState("");
  const [meetingTime, setMeetingTime] = useState("14:30");
  const [phase, setPhase] = useState("");
  const [agenda, setAgenda] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    if (!title.trim()) { setError("Title is required"); return; }
    if (!meetingDate) { setError("Date is required"); return; }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/meetings/add`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, meetingDate, meetingTime, phase, agenda, notes }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to add meeting");
      }
      const data = await res.json();
      onAdded(data.meeting);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="bg-white rounded-sm border border-[#E2E0E1] p-5 mb-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-esm-black">Add Ad-Hoc Meeting</h3>
        <button onClick={onCancel} className="text-esm-grey hover:text-esm-black">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <label className="block text-xs font-medium text-esm-black mb-1">Meeting Title</label>
          <input
            type="text"
            placeholder="e.g. Ad-Hoc: Integration Review"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full text-sm border border-[#E2E0E1] rounded px-3 py-1.5 focus:outline-none focus:border-esm-black"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-esm-black mb-1">Date</label>
          <input
            type="date"
            value={meetingDate}
            onChange={(e) => setMeetingDate(e.target.value)}
            className="w-full text-sm border border-[#E2E0E1] rounded px-3 py-1.5 focus:outline-none focus:border-esm-black"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-esm-black mb-1">Time (EST)</label>
          <select
            value={meetingTime}
            onChange={(e) => setMeetingTime(e.target.value)}
            className="w-full text-sm border border-[#E2E0E1] rounded px-3 py-1.5 focus:outline-none focus:border-esm-black"
          >
            {TIME_OPTIONS.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>
        <div className="col-span-2">
          <label className="block text-xs font-medium text-esm-black mb-1">Phase</label>
          <input
            type="text"
            placeholder="e.g. Configuration, UAT, Go-Live"
            value={phase}
            onChange={(e) => setPhase(e.target.value)}
            className="w-full text-sm border border-[#E2E0E1] rounded px-3 py-1.5 focus:outline-none focus:border-esm-black"
          />
        </div>
        <div className="col-span-2">
          <label className="block text-xs font-medium text-esm-black mb-1">Agenda</label>
          <textarea
            rows={3}
            placeholder="Meeting agenda items..."
            value={agenda}
            onChange={(e) => setAgenda(e.target.value)}
            className="w-full text-sm border border-[#E2E0E1] rounded px-3 py-2 focus:outline-none focus:border-esm-black resize-y"
          />
        </div>
        <div className="col-span-2">
          <label className="block text-xs font-medium text-esm-black mb-1">Notes</label>
          <textarea
            rows={2}
            placeholder="Any additional notes..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full text-sm border border-[#E2E0E1] rounded px-3 py-2 focus:outline-none focus:border-esm-black resize-y"
          />
        </div>
      </div>

      {error && <p className="text-xs text-esm-red">{error}</p>}

      <div className="flex gap-2">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-2 text-sm font-medium bg-esm-red text-white rounded hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {saving ? "Adding..." : "Add Meeting"}
        </button>
        <button
          onClick={onCancel}
          className="px-4 py-2 text-sm font-medium border border-[#E2E0E1] text-esm-grey rounded hover:bg-slate-50 transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
