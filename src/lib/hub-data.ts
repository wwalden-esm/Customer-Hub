import type { HubDashboardData, HubMilestone, HubActionItem, HubMetric, HubUpcomingMeeting, HubIntegration, ActivityEvent, HubDecision, HubDeadline, GoLiveReadinessItem } from "@/types/hub";
import { getGlobalLinks } from "@/lib/settings";
import {
  getProjectById,
  getSmartsheetConfig,
  getProjectMilestones as fetchMilestones,
  getProjectActionItems as fetchActions,
  getProjectMetrics as fetchMetrics,
  getProjectActivity,
  getProjectMeetings as fetchMeetings,
  getProjectIntegrations as fetchIntegrations,
  getRaidLogItems as fetchRaidItems,
  getSheetPermalinks,
  deriveCurrentPhase,
} from "@/lib/smartsheet-data";

export async function getHubDashboardData(projectId: string, contactName?: string): Promise<HubDashboardData | null> {
  const project = getProjectById(projectId);
  if (!project) return null;

  const config = getSmartsheetConfig(projectId);

  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const daysToGoLive = project.goLiveDate
    ? Math.ceil((new Date(project.goLiveDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    : null;

  const rawMilestones = config.projectPlanSheetId
    ? await fetchMilestones(config.projectPlanSheetId)
    : [];

  const milestones: HubMilestone[] = rawMilestones.map((m) => ({
    id: m.id,
    name: m.name,
    date: m.date ?? null,
    startDate: m.startDate ?? null,
    endDate: m.endDate ?? null,
    status: (m.status as HubMilestone["status"]) || "upcoming",
    phase: m.phase ?? null,
    percentComplete: m.percentComplete ?? null,
    isMilestone: m.isMilestone,
    health: m.health,
    level: m.level,
  }));

  const actionSheetId = config.actionItemSheetId || config.raidLogSheetId;
  const rawActions = actionSheetId
    ? await fetchActions(actionSheetId)
    : [];

  const actionItems: HubActionItem[] = rawActions
    .filter((a) => {
      const s = (a.status ?? "").toLowerCase();
      return s !== "done" && s !== "complete" && s !== "closed";
    })
    .map((a) => {
      const isOverdue = a.dueDate ? new Date(a.dueDate) < now : false;
      return {
        id: a.id,
        description: a.description,
        owner: a.owner ?? null,
        dueDate: a.dueDate ?? null,
        priority: (a.priority?.toLowerCase() as HubActionItem["priority"]) || "medium",
        status: (() => {
          const s = (a.status ?? "").toLowerCase();
          if (s.includes("progress")) return "in-progress" as const;
          if (s === "complete" || s === "done" || s === "closed") return "done" as const;
          return "open" as const;
        })(),
        isOverdue,
      };
    });

  const rawMetrics = config.metricsSheetId
    ? await fetchMetrics(config.metricsSheetId)
    : [];

  const metrics: HubMetric[] = rawMetrics.map((m) => ({
    metricType: m.metricType,
    current: m.current,
    total: m.total,
    label: m.label ?? null,
    percent: m.total > 0 ? Math.round((m.current / m.total) * 100) : 0,
  }));

  let intakePercent = 0;
  try {
    const projCfg = (await import("../../config/projects.json")).default as Record<string, { hubspotIntakeId?: string }>;
    const hubspotId = projCfg[projectId]?.hubspotIntakeId;
    if (hubspotId) {
      const { getIntakeRecord, normalizeIntakeData } = await import("@/lib/hubspot");
      const record = await getIntakeRecord(hubspotId);
      const data = await normalizeIntakeData(record);
      const filled = data.fields.filter((f) => f.value && f.value.trim().length > 0).length;
      intakePercent = data.fields.length > 0 ? Math.round((filled / data.fields.length) * 100) : 0;
    }
  } catch { /* intake % stays 0 if HubSpot unavailable */ }

  const activity: ActivityEvent[] = (await getProjectActivity(config)).map((e) => ({
    id: e.id,
    type: e.type,
    title: e.title,
    detail: e.detail,
    timestamp: e.timestamp,
    actor: e.actor,
  }));

  let upcomingMeetings: HubUpcomingMeeting[] = [];
  if (config.meetingTrackerSheetId) {
    try {
      const allMeetings = await fetchMeetings(config.meetingTrackerSheetId);
      upcomingMeetings = allMeetings
        .filter((m) => m.status === "Upcoming" || m.status === "Scheduled")
        .slice(0, 3)
        .map((m) => ({
          id: m.id,
          week: m.week,
          milestone: m.milestone,
          meetingDate: m.meetingDate,
          status: m.status,
          agendaSummary: m.agendaSummary,
          customerDeliverables: m.customerDeliverables,
        }));
    } catch { /* meetings unavailable */ }
  }

  let integrations: HubIntegration[] = [];
  if (config.integrationTrackerSheetId) {
    try {
      const raw = await fetchIntegrations(config.integrationTrackerSheetId);
      integrations = raw.map((r) => ({ id: r.id, name: r.name, status: r.status }));
    } catch { /* integrations unavailable */ }
  }

  const startDate = project.startDate ?? null;
  let daysElapsed: number | null = null;
  let totalDays: number | null = null;
  if (startDate && project.goLiveDate) {
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(project.goLiveDate);
    end.setHours(0, 0, 0, 0);
    totalDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    daysElapsed = Math.max(0, Math.ceil((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
  }

  const globalLinks = getGlobalLinks();
  const projectLinks = project.links ?? [];
  const links = [
    ...globalLinks.map((l) => ({ label: l.label, url: l.url, icon: l.icon })),
    ...projectLinks.map((l) => ({ label: l.label, url: l.url, icon: l.icon })),
  ];

  const team: { name: string; role: string; email?: string }[] = [];
  if (project.scName) team.push({ name: project.scName, role: "Solutions Consultant", email: project.scEmail });
  if (project.pmName) team.push({ name: project.pmName, role: "Project Manager", email: project.pmEmail });

  // --- Decisions from RAID log ---
  let decisions: HubDecision[] = [];
  let allRaidItems: Awaited<ReturnType<typeof fetchRaidItems>> = [];
  if (config.raidLogSheetId) {
    try {
      allRaidItems = await fetchRaidItems(config.raidLogSheetId);
      decisions = allRaidItems
        .filter((r) => r.type === "Decision")
        .map((r) => ({
          id: r.id,
          item: r.item,
          status: r.status,
          notes: r.notes,
          date: r.targetDate,
        }));
    } catch { /* skip */ }
  }

  // --- Customer action items (owned by customer, not ESM staff) ---
  const esmNames: string[] = [
    project.scName?.toLowerCase(),
    project.pmName?.toLowerCase(),
    "esm", "esm solutions",
  ].filter((n): n is string => Boolean(n));

  const customerActionItems: HubActionItem[] = actionItems.filter((a) => {
    if (!a.owner) return false;
    const ownerLower = a.owner.toLowerCase();
    for (let i = 0; i < esmNames.length; i++) {
      if (ownerLower.includes(esmNames[i])) return false;
    }
    return true;
  });

  // --- Upcoming deadlines (consolidated from multiple sources) ---
  const deadlines: HubDeadline[] = [];
  const twoWeeksOut = new Date(now);
  twoWeeksOut.setDate(twoWeeksOut.getDate() + 14);

  for (const a of actionItems) {
    if (!a.dueDate) continue;
    const due = new Date(a.dueDate);
    const daysUntil = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (daysUntil >= -7 && daysUntil <= 14) {
      deadlines.push({ id: `action-${a.id}`, name: a.description, dueDate: a.dueDate, source: "action", owner: a.owner, daysUntil, href: "/hub/raid-log" });
    }
  }

  for (const m of milestones) {
    if (!m.endDate || m.status === "complete") continue;
    const due = new Date(m.endDate);
    const daysUntil = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (daysUntil >= -7 && daysUntil <= 14) {
      deadlines.push({ id: `ms-${m.id}`, name: m.name, dueDate: m.endDate, source: "milestone", owner: null, daysUntil });
    }
  }

  for (const mtg of upcomingMeetings) {
    if (mtg.customerDeliverables && mtg.meetingDate) {
      const due = new Date(mtg.meetingDate);
      const daysUntil = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      if (daysUntil >= -7 && daysUntil <= 14) {
        deadlines.push({ id: `deliv-${mtg.id}`, name: mtg.customerDeliverables, dueDate: mtg.meetingDate, source: "deliverable", owner: null, daysUntil, href: "/hub/meetings" });
      }
    }
  }

  deadlines.sort((a, b) => a.daysUntil - b.daysUntil);

  // --- Go-Live Readiness Checklist ---
  const completedMilestones = milestones.filter((m) => m.status === "complete" && m.isMilestone);
  const totalMilestones = milestones.filter((m) => m.isMilestone);
  const completedIntegrations = integrations.filter((i) => i.status === "Complete");
  const allMeetingsList = config.meetingTrackerSheetId ? await fetchMeetings(config.meetingTrackerSheetId).catch(() => []) : [];
  const completedMeetings = allMeetingsList.filter((m) => m.status === "Complete");
  const totalMeetings = allMeetingsList.length;

  const goLiveReadiness: GoLiveReadinessItem[] = [
    {
      label: "Intake Complete",
      done: intakePercent >= 100,
      detail: intakePercent > 0 ? `${intakePercent}% complete` : null,
      href: "/hub/intake",
    },
    {
      label: "All Milestones Complete",
      done: totalMilestones.length > 0 && completedMilestones.length === totalMilestones.length,
      detail: totalMilestones.length > 0 ? `${completedMilestones.length} of ${totalMilestones.length}` : null,
    },
    {
      label: "Integrations Live",
      done: integrations.length > 0 && completedIntegrations.length === integrations.length,
      detail: integrations.length > 0 ? `${completedIntegrations.length} of ${integrations.length}` : null,
    },
    {
      label: "All Meetings Held",
      done: totalMeetings > 0 && completedMeetings.length === totalMeetings,
      detail: totalMeetings > 0 ? `${completedMeetings.length} of ${totalMeetings}` : null,
      href: "/hub/meetings",
    },
    {
      label: "No Open RAID Items",
      done: allRaidItems.length > 0 && allRaidItems.filter((r) => r.status !== "Complete").length === 0,
      detail: allRaidItems.length > 0 ? `${allRaidItems.filter((r) => r.status !== "Complete").length} open` : null,
      href: "/hub/raid-log",
    },
    {
      label: "UAT Sign-Off",
      done: milestones.some((m) => m.name.toLowerCase().includes("uat") && m.status === "complete"),
      detail: null,
    },
    {
      label: "Training Complete",
      done: milestones.some((m) => m.name.toLowerCase().includes("training") && m.status === "complete"),
      detail: null,
    },
  ];

  // --- Training progress from milestones ---
  const trainingMilestones = milestones.filter((m) => m.name.toLowerCase().includes("training"));
  const trainingProgress = trainingMilestones.length > 0
    ? { completed: trainingMilestones.filter((m) => m.status === "complete").length, total: trainingMilestones.length }
    : null;

  // --- Health history (derive from current status — in a real system this would be stored over time) ---
  const healthHistory: Array<{ week: string; status: "ON_TRACK" | "AT_RISK" | "OFF_TRACK" }> = [];
  if (startDate) {
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const weeksCounted = Math.min(8, Math.max(0, Math.ceil((now.getTime() - start.getTime()) / (7 * 24 * 60 * 60 * 1000))));
    for (let i = weeksCounted; i >= 1; i--) {
      const weekDate = new Date(now);
      weekDate.setDate(weekDate.getDate() - (i - 1) * 7);
      healthHistory.push({
        week: weekDate.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        status: project.status,
      });
    }
  }

  // --- Document types available for generation ---
  const documentTypes = project.documentTypes ?? [
    "workflow-xlsx", "workflow-docx", "uat-tracker", "uat-completion-guide",
    "project-charter", "training-guide", "go-live-checklist",
  ];

  return {
    project: {
      id: project.id,
      customerName: project.customerName,
      projectName: project.projectName,
      products: project.products,
      scName: project.scName,
      scEmail: project.scEmail,
      pmName: project.pmName,
      pmEmail: project.pmEmail,
      startDate,
      goLiveDate: project.goLiveDate ?? null,
      currentPhase: deriveCurrentPhase(rawMilestones, project.currentPhase),
      status: project.status,
      branding: project.branding,
    },
    milestones,
    actionItems,
    customerActionItems,
    metrics,
    intakePercent,
    daysToGoLive,
    daysElapsed,
    totalDays,
    activity,
    upcomingMeetings,
    links,
    team,
    integrations,
    sheetPermalinks: getSheetPermalinks(config),
    decisions,
    deadlines,
    goLiveReadiness,
    trainingProgress,
    healthHistory,
    documentTypes,
    contactName: contactName ?? null,
  };
}
