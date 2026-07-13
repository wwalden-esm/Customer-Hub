"use client";

import { useState, useEffect, useMemo } from "react";
import { parseLocalDate } from "@/lib/date-utils";
import { Badge, type BadgeVariant, Card } from "@/components/ui";
import MeetingPrepChecklist from "@/components/hub/MeetingPrepChecklist";

interface Meeting {
  id: string;
  week: string;
  days: string;
  phase: string;
  milestone: string;
  meetingDate: string | null;
  status: "Upcoming" | "Scheduled" | "Complete" | "Skipped";
  scPrepItems: string;
  agendaSummary: string;
  customerDeliverables: string;
  notes: string;
  actionItemsLogged: boolean;
  recapSent: boolean;
  recapAttachmentId: number | null;
}

const STATUS_VARIANTS: Record<string, BadgeVariant> = {
  Upcoming: "info",
  Scheduled: "warning",
  Complete: "success",
  Skipped: "neutral",
};

const PHASE_VARIANTS: Record<string, BadgeVariant> = {
  "Phase 1 — Kickoff & Discovery": "accent",
  "Phase 2 — Design / Config Training": "accent",
  "Phase 3 — Production Build": "info",
  "Phase 4 — Validation Testing": "warning",
  "Phase 5 — Cutover & Hypercare": "success",
};

const STATUSES = ["All", "Upcoming", "Scheduled", "Complete", "Skipped"] as const;

function fmtDate(d: string | null): string {
  if (!d) return "—";
  return parseLocalDate(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function shortPhase(phase: string): string {
  const match = phase.match(/^Phase (\d)/);
  return match ? `P${match[1]}` : phase;
}

interface RecapData {
  meeting_name: string;
  attendees: string;
  summary: string;
  action_items: { owner: string; task: string; due: string; type: string }[];
  decisions: { title: string; description: string; made_by: string; type: string; impact: string }[];
  risks: { description: string; owner: string; mitigation: string; priority: string }[];
}

function RecapPanel({ meetingId, projectId }: { meetingId: string; projectId: string }) {
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
      <div className="py-3 text-center">
        <svg className="w-4 h-4 animate-spin mx-auto text-esm-grey" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </div>
    );
  }

  if (error || !recap) {
    return <p className="text-xs text-esm-red py-2">{error || "Recap not available"}</p>;
  }

  return (
    <div className="space-y-3 mt-3 pt-3 border-t border-esm-border">
      <div>
        <p className="text-[10px] font-extrabold text-esm-grey tracking-[0.09em] uppercase mb-1">Meeting Summary</p>
        <p className="text-sm text-esm-black">{recap.summary}</p>
      </div>

      {recap.action_items.length > 0 && (
        <div className="pl-4 border-l-2 border-amber-200">
          <p className="text-[10px] font-extrabold text-amber-600 tracking-[0.09em] uppercase mb-1">Action Items</p>
          <ul className="space-y-1">
            {recap.action_items.map((ai, i) => (
              <li key={i} className="text-xs text-esm-black">
                <span className="font-medium">{ai.owner}:</span> {ai.task}
                <span className="text-esm-grey ml-1">(Due: {ai.due})</span>
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

export default function MeetingTrackerClient({ meetings, projectId }: { meetings: Meeting[]; projectId: string }) {
  const [statusFilter, setStatusFilter] = useState("All");
  const [phaseFilter, setPhaseFilter] = useState("All");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [viewingRecap, setViewingRecap] = useState<string | null>(null);

  const phases = useMemo(() => {
    const s = new Set(meetings.map((m) => m.phase).filter(Boolean));
    return ["All", ...Array.from(s)];
  }, [meetings]);

  const filtered = useMemo(() => {
    return meetings.filter((m) => {
      if (statusFilter !== "All" && m.status !== statusFilter) return false;
      if (phaseFilter !== "All" && m.phase !== phaseFilter) return false;
      return true;
    });
  }, [meetings, statusFilter, phaseFilter]);

  const counts = useMemo(() => {
    const c = { total: meetings.length, complete: 0, upcoming: 0, scheduled: 0, skipped: 0 };
    for (const m of meetings) {
      const s = m.status.toLowerCase() as keyof typeof c;
      if (s in c) (c[s] as number)++;
    }
    return c;
  }, [meetings]);

  const toggle = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  if (meetings.length === 0) {
    return (
      <Card padding="sm" className="!px-6 !py-8 text-center">
        <svg className="w-10 h-10 mx-auto text-slate-300 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
        </svg>
        <p className="text-sm text-slate-500">No meetings scheduled yet.</p>
        <p className="text-xs text-esm-muted mt-1">Weekly implementation meetings will appear here once scheduled.</p>
      </Card>
    );
  }

  return (
    <>
      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-5" role="group" aria-label="Meeting summary">
        <Card padding="sm" className="!px-4 !py-3 text-center">
          <p className="text-2xl font-semibold text-esm-black">{counts.total}</p>
          <p className="text-xs text-esm-grey">Total</p>
        </Card>
        {(["Complete", "Scheduled", "Upcoming", "Skipped"] as const).map((s) => {
          const colorMap: Record<string, { active: string; count: string }> = {
            Complete: { active: "border-green-400 bg-green-50", count: "text-green-700" },
            Scheduled: { active: "border-amber-400 bg-amber-50", count: "text-amber-700" },
            Upcoming: { active: "border-blue-400 bg-blue-50", count: "text-blue-700" },
            Skipped: { active: "border-slate-400 bg-slate-50", count: "text-slate-500" },
          };
          const c = colorMap[s];
          return (
            <button
              key={s}
              onClick={() => setStatusFilter(statusFilter === s ? "All" : s)}
              aria-pressed={statusFilter === s}
              className={`rounded-card border px-4 py-3 text-center transition-colors ${
                statusFilter === s ? c.active : "border-esm-border bg-white hover:border-esm-border"
              }`}
            >
              <p className={`text-2xl font-semibold ${c.count}`}>{counts[s.toLowerCase() as keyof typeof counts]}</p>
              <p className="text-xs text-esm-grey">{s}</p>
            </button>
          );
        })}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 mb-4" role="group" aria-label="Filters">
        <fieldset className="flex items-center gap-2">
          <legend className="text-[10px] font-extrabold text-esm-grey tracking-[0.09em] uppercase">Status</legend>
          <div className="flex gap-1" role="radiogroup" aria-label="Filter by status">
            {STATUSES.map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                aria-pressed={statusFilter === s}
                className={`px-2.5 py-1 text-xs font-medium rounded-full transition-colors ${
                  statusFilter === s
                    ? "bg-esm-black text-white"
                    : "bg-gray-100 text-esm-grey hover:bg-gray-200"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </fieldset>
        {phases.length > 2 && (
          <div className="flex items-center gap-2">
            <label htmlFor="phase-filter" className="text-[10px] font-extrabold text-esm-grey tracking-[0.09em] uppercase">Phase</label>
            <select
              id="phase-filter"
              value={phaseFilter}
              onChange={(e) => setPhaseFilter(e.target.value)}
              className="text-xs border border-esm-border rounded-card px-2 py-1 text-esm-black"
            >
              {phases.map((p) => (
                <option key={p} value={p}>{p === "All" ? "All Phases" : shortPhase(p)}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Meeting list */}
      <Card padding="sm" className="!p-0 divide-y divide-esm-border">
        {filtered.length === 0 ? (
          <div className="px-5 py-6 text-center text-sm text-slate-500">
            No meetings match the selected filters.
          </div>
        ) : (
          filtered.map((meeting) => {
            const isExpanded = expanded.has(meeting.id);
            const isPast = meeting.meetingDate && new Date(meeting.meetingDate) < new Date();
            const isNext = !isPast && meeting.status !== "Skipped" && meeting.status !== "Complete";
            const contentId = `meeting-detail-${meeting.id}`;
            const hasDetails = !!(meeting.agendaSummary || meeting.scPrepItems || meeting.customerDeliverables || meeting.notes);

            return (
              <div key={meeting.id} className={`px-5 py-4 ${isNext && !isExpanded ? "bg-blue-50/30" : ""}`}>
                <button
                  onClick={() => toggle(meeting.id)}
                  aria-expanded={isExpanded}
                  aria-controls={hasDetails ? contentId : undefined}
                  className="w-full text-left flex items-start gap-3"
                >
                  <svg
                    className={`w-4 h-4 text-esm-muted mt-0.5 shrink-0 transition-transform ${isExpanded ? "rotate-90" : ""}`}
                    fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-esm-black">{meeting.week}</span>
                      <Badge variant={STATUS_VARIANTS[meeting.status]} pill className="text-xs font-medium">
                        {meeting.status}
                      </Badge>
                      {meeting.phase && (
                        <Badge variant={PHASE_VARIANTS[meeting.phase] ?? "neutral"} pill className="text-xs font-medium">
                          {shortPhase(meeting.phase)}
                        </Badge>
                      )}
                      {meeting.actionItemsLogged && (
                        <span className="text-green-600" aria-label="Action items logged">
                          <svg className="w-4 h-4 inline" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>
                        </span>
                      )}
                      {meeting.recapSent && (
                        <span className="text-blue-600" aria-label="Recap sent">
                          <svg className="w-4 h-4 inline" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                        </span>
                      )}
                    </div>
                    <div className="flex gap-4 mt-1 text-xs text-esm-grey">
                      <span>{fmtDate(meeting.meetingDate)}</span>
                      {meeting.days && <span>{meeting.days}</span>}
                      {meeting.milestone && <span className="truncate max-w-[200px]">{meeting.milestone}</span>}
                    </div>
                  </div>
                </button>

                {isExpanded && (
                  <div id={contentId} className="ml-7 mt-3 space-y-3">
                    {meeting.agendaSummary && (
                      <div className="pl-4 border-l-2 border-esm-border">
                        <p className="text-[10px] font-extrabold text-esm-grey tracking-[0.09em] uppercase mb-1">Agenda</p>
                        <p className="text-sm text-esm-black whitespace-pre-wrap">{meeting.agendaSummary}</p>
                      </div>
                    )}
                    {meeting.scPrepItems && (
                      <div className="pl-4 border-l-2 border-amber-200">
                        <p className="text-[10px] font-extrabold text-amber-600 tracking-[0.09em] uppercase mb-1">SC Prep Items</p>
                        <p className="text-sm text-esm-black whitespace-pre-wrap">{meeting.scPrepItems}</p>
                      </div>
                    )}
                    {meeting.customerDeliverables && (
                      <div>
                        <MeetingPrepChecklist meetingId={meeting.id} deliverables={meeting.customerDeliverables} />
                      </div>
                    )}
                    {meeting.notes && (
                      <div className="pl-4 border-l-2 border-red-200">
                        <p className="text-[10px] font-extrabold text-red-600 tracking-[0.09em] uppercase mb-1">Watch-Out / Notes</p>
                        <p className="text-sm text-esm-black whitespace-pre-wrap">{meeting.notes}</p>
                      </div>
                    )}
                    <div className="flex items-center gap-4 text-xs text-esm-grey pt-1">
                      <span>Action Items: {meeting.actionItemsLogged ? "Logged" : "Pending"}</span>
                      <span>Recap: {meeting.recapSent ? "Sent" : "Pending"}</span>
                      {meeting.recapAttachmentId && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setViewingRecap(viewingRecap === meeting.id ? null : meeting.id);
                          }}
                          className="ml-auto px-2.5 py-1 text-xs font-medium rounded bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors"
                        >
                          {viewingRecap === meeting.id ? "Hide Recap" : "View Recap"}
                        </button>
                      )}
                    </div>

                    {viewingRecap === meeting.id && (
                      <RecapPanel meetingId={meeting.id} projectId={projectId} />
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </Card>

      <p className="text-xs text-esm-muted mt-3" aria-live="polite">
        Showing {filtered.length} of {meetings.length} meetings
      </p>
    </>
  );
}
