"use client";

import { useState } from "react";

const ESM_RED = "#F4333F";
const ESM_GREY = "#686468";
const ESM_BLACK = "#2D2826";
const PINK_TINT = "#FFF3F3";
const GREY_5 = "#F7F7F7";
const EXEC_GOLD = "#7A5C00";
const EXEC_GOLD_BG = "#FFF8E6";
const EXEC_GOLD_BORDER = "#E8C94A";

type PhaseId = "discovery" | "build" | "uat" | "goliveprep" | "hypercare";

const PHASES: { id: PhaseId; label: string; weeks: string }[] = [
  { id: "discovery", label: "Discovery", weeks: "Wks 1–3" },
  { id: "build", label: "Build", weeks: "Wks 4–8" },
  { id: "uat", label: "UAT", weeks: "Wks 9–12" },
  { id: "goliveprep", label: "Go-Live Prep", weeks: "Wks 13–14" },
  { id: "hypercare", label: "Hypercare", weeks: "Wks 15+" },
];

const EXEC_TRIGGERS: Record<PhaseId, { label: string; note: string }[]> = {
  discovery: [
    { label: "Kickoff meeting", note: "Exec opens the engagement — sets tone and authority." },
    { label: "Design sign-off (Part A)", note: "Exec must sign the Solution Design before build begins." },
  ],
  build: [
    { label: "Red health status for 2+ consecutive weeks", note: "Exec needed to unblock decisions or escalate resources." },
    { label: "Scope change or out-of-scope request", note: "Any addition to scope requires exec authorization before SC responds." },
  ],
  uat: [
    { label: "UAT kick-off session", note: "Exec re-confirms testing commitment and team availability." },
    { label: "UAT sign-off", note: "Exec must formally accept test results before go-live planning begins." },
  ],
  goliveprep: [
    { label: "Go / No-Go decision meeting", note: "Exec makes the final call. All criteria reviewed live on this call." },
    { label: "Go-Live Sign-off (Part B)", note: "Exec signature required on the Configuration sign-off." },
  ],
  hypercare: [
    { label: "First post-Go-Live status meeting", note: "Exec confirms first live transaction and post-launch support model." },
  ],
};

interface Segment {
  id: string;
  label: string;
  minutes: number;
  leader: string;
  description: string;
  bullets: string[];
  isDeepDive?: boolean;
  execNote: string | null;
}

const CORE_SEGMENTS: Segment[] = [
  {
    id: "health",
    label: "Project Health & Milestones",
    minutes: 10,
    leader: "SC",
    description: "Read the health banner aloud. Call any milestone that's drifted from plan and state the revised date. Keep it factual — no editorializing.",
    bullets: [
      "Overall status: On Track / At Risk / Off Track",
      "Milestone progress vs. baseline",
      "Any date changes and the reason",
    ],
    execNote: null,
  },
  {
    id: "raid",
    label: "RAID Log — Actions & Blockers",
    minutes: 15,
    leader: "SC",
    description: "Work through open RAID items. Every blocker gets an owner and a clear-by date before moving on.",
    bullets: [
      "Status updates on prior-week actions",
      "New risks surfaced since last meeting",
      "Dependencies on IT / ERP team",
    ],
    execNote: "Flag any risk or blocker that requires exec authority to resolve before the Decision Log segment.",
  },
  {
    id: "deepdive",
    label: "Phase Deep-Dive",
    minutes: 40,
    leader: "SC + Customer Lead",
    description: "The rotating block. Content and facilitation approach shift each phase. See tab below.",
    bullets: [],
    isDeepDive: true,
    execNote: null,
  },
  {
    id: "commitments",
    label: "Next-Week Commitments",
    minutes: 15,
    leader: "All",
    description: "Every attendee states what they will complete before the next meeting. Commitments go into the RAID log before the call ends.",
    bullets: [
      "Customer: data files, decisions, testing tasks",
      "IT team: integration endpoints, SSO, ERP access",
      "SC: configurations, defect resolution, materials",
    ],
    execNote: null,
  },
  {
    id: "decisions",
    label: "Decision Log & Parking Lot",
    minutes: 5,
    leader: "SC",
    description: "Capture formal decisions made during the call. Sidebar topics that surfaced get parked — SC follows up async.",
    bullets: [
      "Confirm decisions recorded verbatim",
      "Assign parking lot follow-ups with due dates",
    ],
    execNote: "If exec sponsor is present: any items requiring their sign-off are called here explicitly before the wrap.",
  },
  {
    id: "wrap",
    label: "Action Assignment & Wrap-Up",
    minutes: 5,
    leader: "SC",
    description: "Read back every new action item — owner, description, due date. No action leaves the room unassigned.",
    bullets: [
      "Recap all new action items",
      "Confirm next meeting date/time — and whether exec is required",
      "Send recap within 24 hours",
    ],
    execNote: null,
  },
];

interface DeepDiveSection {
  heading: string;
  execRequired: boolean;
  items: string[];
}

interface DeepDivePhase {
  focus: string;
  sections: DeepDiveSection[];
  alert: { type: string; message: string } | null;
}

const DEEP_DIVE_CONTENT: Record<PhaseId, DeepDivePhase> = {
  discovery: {
    focus: "Establish the foundation — intake, workflow design, and integration readiness.",
    sections: [
      {
        heading: "Customer Intake Review",
        execRequired: false,
        items: [
          "Walk through incomplete intake sections; assign owners and target dates",
          "Confirm phase scope and any out-of-scope items",
          "Validate team roster and decision authority table",
        ],
      },
      {
        heading: "Workflow Design Decisions",
        execRequired: false,
        items: [
          "Approval routing pattern (sequential / parallel / mixed)",
          "Spend thresholds and escalation tiers",
          "Delegation rules and self-approval policy",
        ],
      },
      {
        heading: "Integration & SSO Readiness",
        execRequired: false,
        items: [
          "Confirm Banner/Ethos endpoint access and API key status",
          "GL/FOAPAL structure walkthrough with IT",
          "SSO type, metadata, and IdP admin contact confirmed",
        ],
      },
      {
        heading: "Design Sign-Off (Part A)",
        execRequired: true,
        items: [
          "Walk Part A of Solution Design — confirm each section with customer lead",
          "Surface any open decisions before sign-off is requested",
          "Exec sponsor reviews and signs — meeting cannot close until signature is confirmed",
        ],
      },
    ],
    alert: null,
  },
  build: {
    focus: "Validate that what's being built matches the signed-off design.",
    sections: [
      {
        heading: "Data File Status",
        execRequired: false,
        items: [
          "Account codes: completeness, format, review with Finance",
          "User file: roles assigned, SSO attributes confirmed",
          "Location and UOM templates: owner and target date",
        ],
      },
      {
        heading: "Configuration Review",
        execRequired: false,
        items: [
          "Walk through Part B of Solution Design — confirm each field value",
          "Entity settings decisions locked (auto-release, receiving, change order fields)",
          "Approval queue build — verify against Workflow Document",
        ],
      },
      {
        heading: "Integration Progress",
        execRequired: false,
        items: [
          "Banner/Ethos: check off enabled endpoints vs. Integration Readiness Checklist",
          "Budget checking live — hard block or warning confirmed",
          "PO write-back tested end-to-end in Training environment",
        ],
      },
      {
        heading: "Scope or Red-Status Escalation",
        execRequired: true,
        items: [
          "Any out-of-scope request surfaces here — exec must be present to authorize or defer",
          "Two consecutive red-status weeks trigger an exec call-in regardless of schedule",
          "SC does not commit to scope changes without exec authorization on record",
        ],
      },
    ],
    alert: null,
  },
  uat: {
    focus: "Drive testing velocity. Every session ends with a higher pass rate and a shorter blocker list.",
    sections: [
      {
        heading: "Tracker Scorecard",
        execRequired: false,
        items: [
          "Pass rate by section — call out any section below 80%",
          "Fail and Blocked count — triage each with an owner and fix ETA",
          "Scenarios still Not Started — commit to start dates for each",
          "Retest completions from prior week — confirm pass/fail updated in tracker",
        ],
      },
      {
        heading: "Blocker Triage",
        execRequired: false,
        items: [
          "Integration blockers: ERP-related fails — IT owner confirms fix timeline",
          "Workflow routing mismatches — SC confirms config fix, retest assigned",
          "GL code rejections — confirm Training sync status with Finance",
          "Access / credential gaps — assign to IT, due before next session",
        ],
      },
      {
        heading: "Testing Plan — Next 7 Days",
        execRequired: false,
        items: [
          "Assign sections to specific testers with named completion dates",
          "Confirm testing sessions scheduled on customer calendar (not just ad hoc)",
          "Verify tracker is shared to SC at end of each testing session — not just weekly",
          "Flag blackouts (board meetings, fiscal close) that compress the window",
        ],
      },
      {
        heading: "UAT Sign-Off",
        execRequired: true,
        items: [
          "All Fail and Blocked scenarios resolved and retested — Pass confirmed",
          "SC presents final pass rate; exec reviews before signing",
          "Exec sponsor signs UAT acceptance — go-live planning begins only after this",
          "Any open items deferred to hypercare are logged and exec-acknowledged",
        ],
      },
    ],
    alert: {
      type: "momentum",
      message:
        "UAT stalls when customers test between sessions instead of in sessions. Commit to at least two independent testing blocks per week. The SC should not be on the call for routine testing — only for triage.",
    },
  },
  goliveprep: {
    focus: "Green-light go-live. Every checklist item has an owner and a confirmed date.",
    sections: [
      {
        heading: "Cutover Checklist Review",
        execRequired: false,
        items: [
          "Walk Part B §B.7 — status, owner, and date for each activity",
          "Production URL distributed to power users",
          "Entity Admin transferred; all build-phase permissions reverted",
        ],
      },
      {
        heading: "Training Readiness",
        execRequired: false,
        items: [
          "Train-the-Trainer delivered — confirm power users attended",
          "Help Center credentials distributed; key training videos reviewed",
          "Consumer Role Training Guide customized with institution contacts",
        ],
      },
      {
        heading: "Go / No-Go Decision",
        execRequired: true,
        items: [
          "All UAT Fails and Blocked resolved — exec confirms readiness",
          "All integration items in §B.6 marked complete — IT confirms live",
          "First live transaction plan agreed (who, what, when)",
          "Exec sponsor signs Go-Live Sign-Off (Part B) — this is the moment of record",
        ],
      },
      {
        heading: "Hypercare Handoff Plan",
        execRequired: false,
        items: [
          "Support model for first 30 days communicated to customer team",
          "Post-Go-Live meeting cadence confirmed",
          "CS handoff package scoped — SC initiates handoff prep",
        ],
      },
    ],
    alert: null,
  },
  hypercare: {
    focus: "Stabilize the live environment and transition cleanly to Customer Success.",
    sections: [
      {
        heading: "Live Transaction Review",
        execRequired: false,
        items: [
          "First live transaction confirmed end-to-end through ERP",
          "Any production issues surfaced since Go-Live — owner and status",
          "PO transmission errors or supplier issues flagged to Supplier Enablement",
        ],
      },
      {
        heading: "Open Issue Log",
        execRequired: false,
        items: [
          "Review open tickets — severity, owner, ETA",
          "Any issues requiring ESM engineering escalation",
          "User access or permission issues from production rollout",
        ],
      },
      {
        heading: "Adoption Health",
        execRequired: false,
        items: [
          "Transaction volume in first week — on track with expectation?",
          "Power user feedback — friction points to address",
          "Non-catalog ordering behavior — within policy?",
        ],
      },
      {
        heading: "First Post-Go-Live Status",
        execRequired: true,
        items: [
          "Exec confirms first live transaction and post-launch support model",
          "Any outstanding issues escalated with exec visibility",
          "CS handoff timeline confirmed — exec introduced to CSM if not already done",
        ],
      },
    ],
    alert: null,
  },
};

function ExecBadge({ small }: { small?: boolean }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        background: EXEC_GOLD_BG,
        border: `1px solid ${EXEC_GOLD_BORDER}`,
        color: EXEC_GOLD,
        fontSize: small ? 10 : 11,
        fontWeight: 700,
        padding: small ? "2px 6px" : "3px 8px",
        borderRadius: 3,
        whiteSpace: "nowrap",
      }}
    >
      ★ Exec Required
    </span>
  );
}

export default function MeetingStructure() {
  const [activePhase, setActivePhase] = useState<PhaseId>("discovery");
  const [showExecGuide, setShowExecGuide] = useState(false);

  const deepDive = DEEP_DIVE_CONTENT[activePhase];
  const totalMinutes = CORE_SEGMENTS.reduce((s, seg) => s + seg.minutes, 0);
  const execTriggers = EXEC_TRIGGERS[activePhase];

  return (
    <div style={{ fontFamily: "Arial, sans-serif", color: ESM_BLACK }}>
      {/* Header */}
      <div
        style={{
          background: ESM_BLACK,
          padding: "28px 36px 24px",
          borderBottom: `4px solid ${ESM_RED}`,
          borderRadius: "4px 4px 0 0",
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", color: ESM_RED, fontWeight: 700, marginBottom: 6 }}>
              ESM Solutions — Implementation Services
            </div>
            <div style={{ fontSize: 26, fontWeight: 700, color: "#fff", lineHeight: 1.2 }}>
              Weekly Status Meeting
            </div>
            <div style={{ fontSize: 14, color: "#aaa", marginTop: 6 }}>
              Standardized 90-minute agenda · All phases
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ background: ESM_RED, color: "#fff", fontSize: 28, fontWeight: 800, padding: "10px 18px", lineHeight: 1, borderRadius: 4 }}>
              90
            </div>
            <div style={{ color: "#aaa", fontSize: 11, marginTop: 4 }}>minutes</div>
          </div>
        </div>
      </div>

      {/* Attendee bar */}
      <div style={{ background: GREY_5, borderBottom: "1px solid #e0e0e0", padding: "10px 36px", display: "flex", gap: 12, fontSize: 12, color: ESM_GREY, alignItems: "center", flexWrap: "wrap" }}>
        <span style={{ fontWeight: 700, color: ESM_BLACK, marginRight: 4 }}>Attendees:</span>
        {["Customer Project Lead + Key Stakeholders", "IT / Integration Team", "ESM SC"].map((a) => (
          <span key={a} style={{ background: "#fff", border: "1px solid #ddd", borderRadius: 3, padding: "3px 8px" }}>{a}</span>
        ))}
        <span style={{ background: EXEC_GOLD_BG, border: `1px solid ${EXEC_GOLD_BORDER}`, color: EXEC_GOLD, borderRadius: 3, padding: "3px 8px", fontWeight: 700 }}>
          ★ Exec Sponsor — key milestones only
        </span>
        <button
          onClick={() => setShowExecGuide(!showExecGuide)}
          style={{
            marginLeft: "auto",
            background: showExecGuide ? EXEC_GOLD_BG : "#fff",
            border: `1px solid ${EXEC_GOLD_BORDER}`,
            color: EXEC_GOLD,
            borderRadius: 3,
            padding: "4px 10px",
            fontSize: 11,
            fontWeight: 700,
            cursor: "pointer",
            fontFamily: "Arial, sans-serif",
          }}
        >
          {showExecGuide ? "▲ Hide exec guide" : "▼ When is exec required?"}
        </button>
      </div>

      {/* Exec guide panel */}
      {showExecGuide && (
        <div style={{ background: EXEC_GOLD_BG, border: `1px solid ${EXEC_GOLD_BORDER}`, borderTop: "none", padding: "20px 36px" }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: EXEC_GOLD, marginBottom: 14, textTransform: "uppercase", letterSpacing: "0.08em" }}>
            ★ Executive Sponsor Attendance Guide
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
            {PHASES.map((p) => (
              <div key={p.id} style={{ background: "#fff", border: `1px solid ${EXEC_GOLD_BORDER}`, borderRadius: 5, padding: "14px 16px" }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: ESM_BLACK, marginBottom: 2 }}>{p.label}</div>
                <div style={{ fontSize: 10, color: ESM_GREY, marginBottom: 10 }}>{p.weeks}</div>
                {EXEC_TRIGGERS[p.id].map((t) => (
                  <div key={t.label} style={{ marginBottom: 8 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: EXEC_GOLD }}>{t.label}</div>
                    <div style={{ fontSize: 11, color: ESM_GREY, lineHeight: 1.4, marginTop: 2 }}>{t.note}</div>
                  </div>
                ))}
              </div>
            ))}
          </div>
          <div style={{ marginTop: 14, fontSize: 11, color: EXEC_GOLD, lineHeight: 1.6 }}>
            <strong>Standing rule:</strong> Any meeting where the health status has been Red for 2+ consecutive weeks becomes exec-required, regardless of phase. SC flags this in the wrap-up of the preceding meeting and sends a separate calendar invite to the exec sponsor.
          </div>
        </div>
      )}

      {/* Time bar */}
      <div style={{ padding: "28px 36px 0" }}>
        <div style={{ fontSize: 11, color: ESM_GREY, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 10, fontWeight: 700 }}>
          Time allocation
        </div>
        <div style={{ display: "flex", borderRadius: 4, overflow: "hidden", height: 36, border: "1px solid #e0e0e0" }}>
          {CORE_SEGMENTS.map((seg) => {
            const pct = (seg.minutes / totalMinutes) * 100;
            return (
              <div
                key={seg.id}
                title={`${seg.label} — ${seg.minutes} min`}
                style={{
                  width: `${pct}%`,
                  background: seg.isDeepDive ? ESM_RED : seg.id === "commitments" ? "#c0383e" : seg.id === "health" || seg.id === "raid" ? "#4a4648" : "#7a767a",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 11,
                  fontWeight: 700,
                  color: "#fff",
                  borderRight: seg.id !== "wrap" ? "2px solid #fff" : "none",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                }}
              >
                {seg.minutes}m
              </div>
            );
          })}
        </div>
      </div>

      {/* Core agenda */}
      <div style={{ padding: "24px 36px 0" }}>
        <div style={{ fontSize: 11, color: ESM_GREY, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 14, fontWeight: 700 }}>
          Standing agenda — every week
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 0, border: "1px solid #eee", borderRadius: 5, overflow: "hidden" }}>
          {CORE_SEGMENTS.map((seg, i) => (
            <div
              key={seg.id}
              style={{
                display: "flex",
                borderBottom: i < CORE_SEGMENTS.length - 1 ? "1px solid #eee" : "none",
                background: seg.isDeepDive ? PINK_TINT : "#fff",
                borderLeft: seg.isDeepDive ? `4px solid ${ESM_RED}` : "4px solid transparent",
                padding: "16px 16px 16px 20px",
                gap: 20,
                alignItems: "flex-start",
              }}
            >
              <div style={{ flexShrink: 0, width: 48, textAlign: "center" }}>
                <div style={{ fontSize: 18, fontWeight: 800, color: seg.isDeepDive ? ESM_RED : ESM_GREY, lineHeight: 1 }}>
                  {seg.minutes}
                </div>
                <div style={{ fontSize: 10, color: ESM_GREY }}>min</div>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: seg.isDeepDive ? ESM_RED : ESM_BLACK }}>
                    {seg.label}
                  </div>
                  <div style={{ fontSize: 10, background: seg.isDeepDive ? ESM_RED : GREY_5, color: seg.isDeepDive ? "#fff" : ESM_GREY, padding: "2px 7px", borderRadius: 3, fontWeight: 600 }}>
                    {seg.leader}
                  </div>
                </div>
                <div style={{ fontSize: 12, color: ESM_GREY, lineHeight: 1.5, marginBottom: seg.bullets.length ? 8 : 0 }}>
                  {seg.isDeepDive ? "Rotating content — shifts each phase. Select a phase below to see the agenda for this block." : seg.description}
                </div>
                {seg.bullets.length > 0 && (
                  <ul style={{ margin: 0, paddingLeft: 16, fontSize: 12, color: "#555", lineHeight: 1.8 }}>
                    {seg.bullets.map((b) => <li key={b}>{b}</li>)}
                  </ul>
                )}
                {seg.execNote && (
                  <div style={{ marginTop: 10, background: EXEC_GOLD_BG, border: `1px solid ${EXEC_GOLD_BORDER}`, borderRadius: 4, padding: "8px 12px", fontSize: 11, color: EXEC_GOLD, display: "flex", gap: 6, alignItems: "flex-start" }}>
                    <span style={{ fontWeight: 700, flexShrink: 0 }} aria-hidden="true">★</span>
                    <span>{seg.execNote}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Phase selector */}
      <div style={{ padding: "32px 36px 0" }}>
        <div style={{ fontSize: 11, color: ESM_GREY, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 14, fontWeight: 700 }}>
          Phase deep-dive content — select phase
        </div>
        <div style={{ display: "flex", gap: 0, borderRadius: "6px 6px 0 0", overflow: "hidden", border: "1px solid #ddd", borderBottom: "none" }}>
          {PHASES.map((p) => (
            <button
              key={p.id}
              onClick={() => setActivePhase(p.id)}
              style={{
                flex: 1,
                padding: "11px 8px",
                border: "none",
                borderRight: p.id !== "hypercare" ? "1px solid #ddd" : "none",
                background: activePhase === p.id ? ESM_RED : "#fff",
                color: activePhase === p.id ? "#fff" : ESM_BLACK,
                cursor: "pointer",
                fontFamily: "Arial, sans-serif",
                fontWeight: 700,
                fontSize: 12,
                textAlign: "center",
                transition: "background 0.15s",
              }}
            >
              <div>{p.label}</div>
              <div style={{ fontSize: 10, fontWeight: 400, marginTop: 2, color: activePhase === p.id ? "rgba(255,255,255,0.75)" : ESM_GREY }}>
                {p.weeks}
              </div>
              {EXEC_TRIGGERS[p.id].length > 0 && (
                <div style={{ fontSize: 9, fontWeight: 700, color: activePhase === p.id ? EXEC_GOLD_BORDER : EXEC_GOLD, marginTop: 3 }}>
                  ★ Exec milestones
                </div>
              )}
            </button>
          ))}
        </div>

        {/* Deep dive panel */}
        <div style={{ background: PINK_TINT, border: "1px solid #f0d0d0", borderTop: `3px solid ${ESM_RED}`, borderRadius: "0 0 6px 6px", padding: "24px 28px" }}>
          <div style={{ fontSize: 13, color: ESM_RED, fontWeight: 700, marginBottom: 4 }}>Phase Focus</div>
          <div style={{ fontSize: 13, color: ESM_BLACK, marginBottom: 16, lineHeight: 1.5 }}>{deepDive.focus}</div>

          {execTriggers.length > 0 && (
            <div style={{ background: EXEC_GOLD_BG, border: `1px solid ${EXEC_GOLD_BORDER}`, borderRadius: 5, padding: "12px 16px", marginBottom: 20 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: EXEC_GOLD, marginBottom: 8 }}>★ Exec-Required Meetings This Phase</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {execTriggers.map((t) => (
                  <div key={t.label} style={{ display: "flex", gap: 10, fontSize: 11, alignItems: "flex-start" }}>
                    <span style={{ color: EXEC_GOLD, fontWeight: 700, flexShrink: 0 }}>→</span>
                    <span><strong style={{ color: EXEC_GOLD }}>{t.label}:</strong> <span style={{ color: ESM_BLACK }}>{t.note}</span></span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {deepDive.alert && (
            <div style={{ background: ESM_RED, color: "#fff", borderRadius: 5, padding: "12px 16px", fontSize: 12, lineHeight: 1.6, marginBottom: 20, display: "flex", gap: 10, alignItems: "flex-start" }}>
              <span style={{ fontSize: 16, flexShrink: 0 }}>⚡</span>
              <span>{deepDive.alert.message}</span>
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            {deepDive.sections.map((sec) => (
              <div
                key={sec.heading}
                style={{
                  background: "#fff",
                  border: sec.execRequired ? `1.5px solid ${EXEC_GOLD_BORDER}` : "1px solid #e8cece",
                  borderRadius: 5,
                  padding: "16px 18px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10, paddingBottom: 8, borderBottom: `1px solid ${sec.execRequired ? EXEC_GOLD_BORDER : "#f0e0e0"}`, gap: 8, flexWrap: "wrap" }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: sec.execRequired ? EXEC_GOLD : ESM_BLACK }}>
                    {sec.heading}
                  </div>
                  {sec.execRequired && <ExecBadge small />}
                </div>
                <ul style={{ margin: 0, paddingLeft: 16, fontSize: 12, color: "#444", lineHeight: 1.8 }}>
                  {sec.items.map((item) => <li key={item}>{item}</li>)}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Ground rules */}
      <div style={{ padding: "32px 36px 0" }}>
        <div style={{ fontSize: 11, color: ESM_GREY, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 14, fontWeight: 700 }}>
          Meeting ground rules
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
          {[
            { rule: "No action leaves unassigned", detail: "Every item has an owner and a date before the recap is sent." },
            { rule: "Blockers must have an ETA", detail: "\"Working on it\" is not a status. Commit to a resolution date or escalate." },
            { rule: "Recap within 24 hours", detail: "SC sends the meeting recap email same day or by end of next business morning." },
            { rule: "Flag exec meetings one week ahead", detail: "SC gives the exec sponsor 7 days' notice for any required attendance — no surprise calendar invites." },
            { rule: "Parking lot stays parked", detail: "Off-agenda topics are logged and handled async — not expanded in the call." },
            { rule: "Tracker shared daily during UAT", detail: "Customer shares the UAT tracker with SC at end of each testing session, not just weekly." },
          ].map((g) => (
            <div key={g.rule} style={{ background: GREY_5, border: "1px solid #e4e4e4", borderRadius: 5, padding: "14px 16px" }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: ESM_BLACK, marginBottom: 5 }}>{g.rule}</div>
              <div style={{ fontSize: 11, color: ESM_GREY, lineHeight: 1.5 }}>{g.detail}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
