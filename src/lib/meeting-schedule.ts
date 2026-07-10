import { parseLocalDate } from "@/lib/date-utils";

interface PhaseRange {
  id: string;
  label: string;
  startWeek: number;
  endWeek: number;
}

interface ExecTrigger {
  week: "first" | "last" | number;
  label: string;
}

const PHASES: PhaseRange[] = [
  { id: "discovery", label: "Discovery", startWeek: 1, endWeek: 3 },
  { id: "build", label: "Build", startWeek: 4, endWeek: 8 },
  { id: "uat", label: "UAT", startWeek: 9, endWeek: 12 },
  { id: "goliveprep", label: "Go-Live Prep", startWeek: 13, endWeek: 14 },
  { id: "hypercare", label: "Hypercare", startWeek: 15, endWeek: 18 },
];

const EXEC_MILESTONES: Record<string, ExecTrigger[]> = {
  discovery: [
    { week: "first", label: "Kickoff — Exec opens engagement" },
    { week: "last", label: "Design Sign-Off (Part A)" },
  ],
  uat: [
    { week: "first", label: "UAT Kick-Off — Exec confirms testing commitment" },
    { week: "last", label: "UAT Sign-Off — Exec accepts test results" },
  ],
  goliveprep: [
    { week: "last", label: "Go / No-Go Decision + Go-Live Sign-Off (Part B)" },
  ],
  hypercare: [
    { week: "first", label: "First Post-Go-Live Status — Exec confirms live" },
  ],
};

const PHASE_AGENDAS: Record<string, (weekInPhase: number, totalPhaseWeeks: number) => string> = {
  discovery: (w, total) => {
    if (w === 1) return "Kickoff: Project intro, team roster, authority table. Intake review — assign owners for incomplete sections. Confirm phase scope.";
    if (w === total) return "Design Sign-Off (Part A): Walk Solution Design, surface open decisions, exec reviews and signs. Integration & SSO readiness check.";
    return "Intake progress review. Workflow design decisions: approval routing, spend thresholds, delegation rules. Integration & SSO readiness status.";
  },
  build: (w, total) => {
    if (w === 1) return "Data file status: account codes, user file, location/UOM templates. Part B config review begins. Integration endpoint check.";
    if (w === total) return "Final config review against Workflow Document. Integration end-to-end test results. Pre-UAT readiness assessment.";
    return "Data file completeness check. Configuration review — Part B field values. Integration progress: endpoints, budget checking, PO write-back testing.";
  },
  uat: (w, total) => {
    if (w === 1) return "UAT Kick-Off: Tracker scorecard baseline, testing plan for first week, tester assignments. Exec confirms testing commitment.";
    if (w === total) return "UAT Sign-Off: Final pass rate review, all Fail/Blocked resolved. Exec signs UAT acceptance. Deferred items logged for hypercare.";
    return "Tracker scorecard: pass rate by section, fail/blocked triage with owners and ETAs. Testing plan for next 7 days. Retest completions review.";
  },
  goliveprep: (w, total) => {
    if (w === total) return "Go / No-Go Decision: All UAT items resolved, integrations confirmed live. First live transaction plan. Exec signs Go-Live Sign-Off (Part B). Hypercare handoff plan.";
    return "Cutover checklist review (Part B §B.7). Training readiness: train-the-trainer, Help Center, Consumer Role Guide. Production URL distribution.";
  },
  hypercare: (w) => {
    if (w === 1) return "First Post-Go-Live Status: Live transaction review, production issues triage. Exec confirms post-launch support model. CS handoff timeline.";
    return "Open issue log: severity, owner, ETA. Adoption health: transaction volume, power user feedback. Ongoing support items.";
  },
};

const PHASE_DELIVERABLES: Record<string, (weekInPhase: number, totalPhaseWeeks: number) => string> = {
  discovery: (w, total) => {
    if (w === 1) return "Team roster with decision authority, initial intake data";
    if (w === total) return "Completed intake sections, exec available for sign-off";
    return "Intake section completions per assigned schedule";
  },
  build: (w) => {
    if (w === 1) return "Account code file, user file draft, IT endpoint access";
    return "Data file updates, configuration decisions, IT integration milestones";
  },
  uat: (w, total) => {
    if (w === 1) return "Tester availability confirmed, testing schedule blocked on calendar";
    if (w === total) return "All test scenarios completed, exec available for sign-off";
    return "Completed test scenarios per plan, tracker shared with SC after each session";
  },
  goliveprep: (_w, total) => {
    if (_w === total) return "Exec available for Go/No-Go, power users trained, production readiness confirmed";
    return "Cutover checklist items per assigned schedule, training attendance";
  },
  hypercare: (w) => {
    if (w === 1) return "First live transaction ready, open issues documented";
    return "Issue reports, adoption feedback, support transition items";
  },
};

const PHASE_PREP: Record<string, (weekInPhase: number, totalPhaseWeeks: number) => string> = {
  discovery: (w, total) => {
    if (w === 1) return "Kickoff deck, project charter, intake form access, team intro";
    if (w === total) return "Part A Solution Design finalized for review, sign-off document ready";
    return "Intake progress report, workflow design options prepared";
  },
  build: (w) => {
    if (w === 1) return "Data file templates distributed, Part B config draft";
    return "Config updates applied, integration test results compiled";
  },
  uat: (w, total) => {
    if (w === 1) return "UAT tracker distributed, test scenarios mapped, tester credentials confirmed";
    if (w === total) return "Final pass rate report, sign-off document ready, deferred items list";
    return "Blocker resolutions applied, retest items ready, scorecard updated";
  },
  goliveprep: (_w, total) => {
    if (_w === total) return "Go/No-Go criteria checklist, Part B sign-off document, hypercare plan";
    return "Cutover checklist status, training materials finalized";
  },
  hypercare: (w) => {
    if (w === 1) return "Production monitoring setup, support escalation paths documented";
    return "Issue resolution updates, adoption metrics pulled";
  },
};

export interface GeneratedMeeting {
  week: string;
  days: string;
  phase: string;
  milestone: string;
  meetingDate: string;
  status: string;
  scPrepItems: string;
  agendaSummary: string;
  customerDeliverables: string;
  notes: string;
}

export function generateMeetingSchedule(
  startDate: string,
  goLiveDate: string,
  meetingDay: number, // 0=Sun, 1=Mon, 2=Tue, etc.
  meetingTime: string = "14:30", // HH:mm in EST
): GeneratedMeeting[] {
  const start = parseLocalDate(startDate);
  const end = parseLocalDate(goLiveDate);
  const totalProjectDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  const totalProjectWeeks = Math.max(1, Math.ceil(totalProjectDays / 7));

  // Scale phase durations to fit the actual project length
  const templateTotalWeeks = 18;
  const scale = totalProjectWeeks / templateTotalWeeks;

  const scaledPhases = PHASES.map((p) => ({
    ...p,
    startWeek: Math.max(1, Math.round((p.startWeek - 1) * scale) + 1),
    endWeek: Math.min(totalProjectWeeks, Math.round(p.endWeek * scale)),
  }));

  // Ensure phases don't overlap and cover all weeks
  for (let i = 1; i < scaledPhases.length; i++) {
    if (scaledPhases[i].startWeek <= scaledPhases[i - 1].endWeek) {
      scaledPhases[i].startWeek = scaledPhases[i - 1].endWeek + 1;
    }
  }
  scaledPhases[scaledPhases.length - 1].endWeek = totalProjectWeeks;

  const meetings: GeneratedMeeting[] = [];

  for (let week = 1; week <= totalProjectWeeks; week++) {
    // Find which phase this week is in
    const phase = scaledPhases.find((p) => week >= p.startWeek && week <= p.endWeek)
      || scaledPhases[scaledPhases.length - 1];

    const weekInPhase = week - phase.startWeek + 1;
    const totalPhaseWeeks = phase.endWeek - phase.startWeek + 1;

    // Calculate meeting date: first occurrence of meetingDay on or after week start
    const weekStart = new Date(start);
    weekStart.setDate(weekStart.getDate() + (week - 1) * 7);
    const dayDiff = (meetingDay - weekStart.getDay() + 7) % 7;
    const meetDate = new Date(weekStart);
    meetDate.setDate(meetDate.getDate() + dayDiff);

    const daysFromStart = Math.ceil((meetDate.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));

    // Check for exec milestones
    const triggers = EXEC_MILESTONES[phase.id] || [];
    const milestone = triggers
      .filter((t) =>
        (t.week === "first" && weekInPhase === 1) ||
        (t.week === "last" && weekInPhase === totalPhaseWeeks) ||
        (typeof t.week === "number" && weekInPhase === t.week),
      )
      .map((t) => t.label)
      .join("; ");

    const agendaFn = PHASE_AGENDAS[phase.id];
    const delivFn = PHASE_DELIVERABLES[phase.id];
    const prepFn = PHASE_PREP[phase.id];

    const dateStr = `${meetDate.toISOString().split("T")[0]}T${meetingTime}:00`;

    meetings.push({
      week: `Week ${week}`,
      days: `Day ${daysFromStart}`,
      phase: phase.label,
      milestone,
      meetingDate: dateStr,
      status: "Upcoming",
      scPrepItems: prepFn ? prepFn(weekInPhase, totalPhaseWeeks) : "",
      agendaSummary: agendaFn ? agendaFn(weekInPhase, totalPhaseWeeks) : "",
      customerDeliverables: delivFn ? delivFn(weekInPhase, totalPhaseWeeks) : "",
      notes: milestone ? "★ Exec sponsor required" : "",
    });
  }

  return meetings;
}
