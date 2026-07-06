import type { HubDashboardData, HubMilestone, HubActionItem, HubMetric, HubUpcomingMeeting, ActivityEvent } from "@/types/hub";
import {
  getProjectById,
  getSmartsheetConfig,
  getProjectMilestones as fetchMilestones,
  getProjectActionItems as fetchActions,
  getProjectMetrics as fetchMetrics,
  getProjectActivity,
  getProjectMeetings as fetchMeetings,
} from "@/lib/smartsheet-data";

export async function getHubDashboardData(projectId: string): Promise<HubDashboardData | null> {
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
  }));

  const rawActions = config.actionItemSheetId
    ? await fetchActions(config.actionItemSheetId)
    : [];

  const actionItems: HubActionItem[] = rawActions
    .filter((a) => a.status !== "done")
    .map((a) => {
      const isOverdue = a.dueDate ? new Date(a.dueDate) < now : false;
      return {
        id: a.id,
        description: a.description,
        owner: a.owner ?? null,
        dueDate: a.dueDate ?? null,
        priority: (a.priority as HubActionItem["priority"]) || "medium",
        status: (a.status as HubActionItem["status"]) || "open",
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
      const data = normalizeIntakeData(record);
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
        }));
    } catch { /* meetings unavailable */ }
  }

  return {
    project: {
      id: project.id,
      customerName: project.customerName,
      projectName: project.projectName,
      products: project.products,
      scName: project.scName,
      scEmail: project.scEmail,
      goLiveDate: project.goLiveDate ?? null,
      currentPhase: project.currentPhase,
      status: project.status,
      branding: project.branding,
    },
    milestones,
    actionItems,
    metrics,
    intakePercent,
    daysToGoLive,
    activity,
    upcomingMeetings,
  };
}
