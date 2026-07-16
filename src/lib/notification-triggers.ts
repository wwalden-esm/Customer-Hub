import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";
import { getProjectList, getSmartsheetConfig, getProjectActionItems, getProjectMilestones } from "./smartsheet-data";
import { addHubNotification } from "./hub-notification-store";
import { getAllQuestions } from "./question-store";
import { logAudit } from "./audit-log";
import { parseLocalDate } from "./date-utils";

// ---------------------------------------------------------------------------
// Notification tracker — prevents duplicate notifications
// ---------------------------------------------------------------------------

interface NotificationTracker {
  overdueNotified: string[];
  upcomingNotified: string[];
  unansweredNotified: string[];
}

const TRACKER_PATH = join(process.cwd(), "config", "notification-tracker.json");

function loadTracker(): NotificationTracker {
  if (!existsSync(TRACKER_PATH)) {
    return { overdueNotified: [], upcomingNotified: [], unansweredNotified: [] };
  }
  try {
    return JSON.parse(readFileSync(TRACKER_PATH, "utf-8"));
  } catch {
    return { overdueNotified: [], upcomingNotified: [], unansweredNotified: [] };
  }
}

function saveTracker(tracker: NotificationTracker): void {
  writeFileSync(TRACKER_PATH, JSON.stringify(tracker, null, 2) + "\n", "utf-8");
}

// ---------------------------------------------------------------------------
// Check: overdue action items
// ---------------------------------------------------------------------------

export async function checkOverdueItems(projectId: string): Promise<number> {
  const config = getSmartsheetConfig(projectId);
  if (!config.actionItemSheetId) return 0;

  const items = await getProjectActionItems(config.actionItemSheetId);
  const tracker = loadTracker();
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  let count = 0;

  for (const item of items) {
    if (!item.dueDate) continue;
    const status = String(item.status).toLowerCase();
    if (status === "complete" || status === "completed" || status === "done") continue;
    if (tracker.overdueNotified.includes(item.id)) continue;

    const due = parseLocalDate(String(item.dueDate));
    if (due >= now) continue;

    addHubNotification(
      projectId,
      "Overdue action item",
      `"${item.description}" was due ${String(item.dueDate).split("T")[0]}${item.owner ? ` (owner: ${item.owner})` : ""}`,
    );
    tracker.overdueNotified.push(item.id);
    count++;
  }

  if (count > 0) {
    saveTracker(tracker);
  }

  return count;
}

// ---------------------------------------------------------------------------
// Check: upcoming deadlines (within 7 days)
// ---------------------------------------------------------------------------

export async function checkUpcomingDeadlines(projectId: string): Promise<number> {
  const config = getSmartsheetConfig(projectId);
  const tracker = loadTracker();
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const horizon = new Date(now);
  horizon.setDate(horizon.getDate() + 7);

  let count = 0;

  // Check milestones
  if (config.projectPlanSheetId) {
    const milestones = await getProjectMilestones(config.projectPlanSheetId);
    for (const ms of milestones) {
      const dateStr = ms.endDate ?? ms.date;
      if (!dateStr) continue;
      const status = String(ms.status).toLowerCase();
      if (status === "complete" || status === "completed") continue;
      if (tracker.upcomingNotified.includes(ms.id)) continue;

      const due = parseLocalDate(dateStr);
      if (due < now || due > horizon) continue;

      addHubNotification(
        projectId,
        "Upcoming milestone deadline",
        `"${ms.name}" is due ${dateStr}${ms.phase ? ` (${ms.phase})` : ""}`,
      );
      tracker.upcomingNotified.push(ms.id);
      count++;
    }
  }

  // Check action items
  if (config.actionItemSheetId) {
    const items = await getProjectActionItems(config.actionItemSheetId);
    for (const item of items) {
      if (!item.dueDate) continue;
      const status = String(item.status).toLowerCase();
      if (status === "complete" || status === "completed" || status === "done") continue;
      if (tracker.upcomingNotified.includes(item.id)) continue;

      const due = parseLocalDate(String(item.dueDate));
      if (due < now || due > horizon) continue;

      addHubNotification(
        projectId,
        "Upcoming action item deadline",
        `"${item.description}" is due ${String(item.dueDate).split("T")[0]}${item.owner ? ` (owner: ${item.owner})` : ""}`,
      );
      tracker.upcomingNotified.push(item.id);
      count++;
    }
  }

  if (count > 0) {
    saveTracker(tracker);
  }

  return count;
}

// ---------------------------------------------------------------------------
// Check: unanswered questions (open > 48 hours)
// ---------------------------------------------------------------------------

const FORTY_EIGHT_HOURS_MS = 48 * 60 * 60 * 1000;

export function checkUnansweredQuestions(): number {
  const questions = getAllQuestions();
  const tracker = loadTracker();
  const now = Date.now();

  let count = 0;

  for (const q of questions) {
    if (q.status !== "open") continue;
    if (tracker.unansweredNotified.includes(q.id)) continue;

    const createdAt = new Date(q.createdAt).getTime();
    if (now - createdAt < FORTY_EIGHT_HOURS_MS) continue;

    addHubNotification(
      q.projectId,
      "Unanswered customer question",
      `Question from ${q.senderName}: "${q.subject}" has been open since ${q.createdAt.split("T")[0]}`,
    );
    tracker.unansweredNotified.push(q.id);
    count++;
  }

  if (count > 0) {
    saveTracker(tracker);
  }

  return count;
}

// ---------------------------------------------------------------------------
// Run all checks across all projects
// ---------------------------------------------------------------------------

export interface CheckSummary {
  overdueCount: number;
  upcomingCount: number;
  unansweredCount: number;
  projectsChecked: number;
  errors: string[];
}

export async function runAllChecks(): Promise<CheckSummary> {
  const projects = getProjectList();
  const summary: CheckSummary = {
    overdueCount: 0,
    upcomingCount: 0,
    unansweredCount: 0,
    projectsChecked: projects.length,
    errors: [],
  };

  for (const project of projects) {
    try {
      summary.overdueCount += await checkOverdueItems(project.id);
    } catch (e) {
      summary.errors.push(`overdue check failed for ${project.id}: ${e instanceof Error ? e.message : String(e)}`);
    }

    try {
      summary.upcomingCount += await checkUpcomingDeadlines(project.id);
    } catch (e) {
      summary.errors.push(`upcoming check failed for ${project.id}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  // Unanswered questions is cross-project
  try {
    summary.unansweredCount = checkUnansweredQuestions();
  } catch (e) {
    summary.errors.push(`unanswered questions check failed: ${e instanceof Error ? e.message : String(e)}`);
  }

  logAudit(
    "system",
    "run_notification_checks",
    "all",
    "notification",
    `overdue=${summary.overdueCount} upcoming=${summary.upcomingCount} unanswered=${summary.unansweredCount} errors=${summary.errors.length}`,
  );

  return summary;
}
