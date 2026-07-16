import {
  getProjectList,
  getProjectById,
  getSmartsheetConfig,
  getProjectMilestones,
  getProjectActionItems,
  getRaidLogItems,
  getProjectContacts,
} from "@/lib/smartsheet-data";
import { getProjectQuestions } from "@/lib/question-store";
import { sendNotificationEmailSafe } from "@/lib/email";
import { parseLocalDate } from "@/lib/date-utils";
import { logAudit } from "@/lib/audit-log";
import type { Milestone, ActionItem, RaidLogItem } from "@/types/models";
import type { Question } from "@/lib/question-store";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DigestData {
  projectName: string;
  customerName: string;
  periodStart: string;
  periodEnd: string;
  completedMilestones: Milestone[];
  upcomingMilestones: Milestone[];
  overdueMilestones: Milestone[];
  openActionItems: number;
  overdueActionItems: number;
  newRaidItems: RaidLogItem[];
  openQuestions: number;
  newQuestions: number;
  healthStatus: "on-track" | "at-risk" | "off-track";
  healthDetail: string;
}

export interface DigestSendResult {
  projectId: string;
  customerName: string;
  recipients: string[];
  errors: string[];
}

export interface DigestSummary {
  sent: DigestSendResult[];
  skipped: string[];
  errors: string[];
}

// ---------------------------------------------------------------------------
// Digest data assembly
// ---------------------------------------------------------------------------

export async function generateDigestForProject(projectId: string): Promise<DigestData | null> {
  const project = getProjectById(projectId);
  if (!project) return null;

  const config = getSmartsheetConfig(projectId);
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const sevenDaysAgo = new Date(todayStart.getTime() - 7 * 24 * 60 * 60 * 1000);
  const fourteenDaysAhead = new Date(todayStart.getTime() + 14 * 24 * 60 * 60 * 1000);

  // Fetch milestones
  let milestones: Milestone[] = [];
  if (config.projectPlanSheetId) {
    try {
      milestones = await getProjectMilestones(config.projectPlanSheetId);
    } catch (err) {
      console.error(`[DIGEST] Failed to fetch milestones for ${projectId}:`, err);
    }
  }

  // Completed milestones this week (status = complete, endDate within last 7 days)
  const completedMilestones = milestones.filter((m) => {
    const s = m.status.toLowerCase();
    if (s !== "complete" && s !== "completed") return false;
    const d = m.endDate ?? m.date;
    if (!d) return false;
    const parsed = parseLocalDate(d);
    return parsed >= sevenDaysAgo && parsed <= todayStart;
  });

  // Upcoming milestones (next 14 days, not complete)
  const upcomingMilestones = milestones.filter((m) => {
    const s = m.status.toLowerCase();
    if (s === "complete" || s === "completed") return false;
    const d = m.endDate ?? m.date;
    if (!d) return false;
    const parsed = parseLocalDate(d);
    return parsed > todayStart && parsed <= fourteenDaysAhead;
  });

  // Overdue milestones (past due, not complete)
  const overdueMilestones = milestones.filter((m) => {
    const s = m.status.toLowerCase();
    if (s === "complete" || s === "completed") return false;
    const d = m.endDate ?? m.date;
    if (!d) return false;
    const parsed = parseLocalDate(d);
    return parsed < todayStart;
  });

  // Action items
  let actionItems: ActionItem[] = [];
  if (config.actionItemSheetId) {
    try {
      actionItems = await getProjectActionItems(config.actionItemSheetId);
    } catch (err) {
      console.error(`[DIGEST] Failed to fetch action items for ${projectId}:`, err);
    }
  }

  const openActionItems = actionItems.filter((ai) => {
    const s = ai.status.toLowerCase();
    return s !== "complete" && s !== "completed" && s !== "done";
  });

  const overdueActionItems = openActionItems.filter((ai) => {
    if (!ai.dueDate) return false;
    const due = parseLocalDate(ai.dueDate);
    return due < todayStart;
  });

  // RAID log items (new / active)
  let raidItems: RaidLogItem[] = [];
  if (config.raidLogSheetId) {
    try {
      raidItems = await getRaidLogItems(config.raidLogSheetId);
    } catch (err) {
      console.error(`[DIGEST] Failed to fetch RAID items for ${projectId}:`, err);
    }
  }

  const newRaidItems = raidItems.filter((r) => {
    if (r.status === "Complete") return false;
    if (r.targetDate) {
      const parsed = parseLocalDate(r.targetDate);
      return parsed >= sevenDaysAgo;
    }
    // No target date — include if status is New
    return r.status === "New";
  });

  // Questions
  let questions: Question[] = [];
  try {
    questions = getProjectQuestions(projectId);
  } catch (err) {
    console.error(`[DIGEST] Failed to fetch questions for ${projectId}:`, err);
  }

  const openQuestions = questions.filter((q) => q.status === "open").length;
  const newQuestions = questions.filter((q) => {
    const created = parseLocalDate(q.createdAt);
    return created >= sevenDaysAgo;
  }).length;

  // Health status derivation
  const { healthStatus, healthDetail } = deriveHealthStatus(
    overdueMilestones,
    overdueActionItems,
    milestones,
  );

  const periodStart = formatDateStr(sevenDaysAgo);
  const periodEnd = formatDateStr(todayStart);

  return {
    projectName: project.projectName,
    customerName: project.customerName,
    periodStart,
    periodEnd,
    completedMilestones,
    upcomingMilestones,
    overdueMilestones,
    openActionItems: openActionItems.length,
    overdueActionItems: overdueActionItems.length,
    newRaidItems,
    openQuestions,
    newQuestions,
    healthStatus,
    healthDetail,
  };
}

// ---------------------------------------------------------------------------
// Health derivation
// ---------------------------------------------------------------------------

function deriveHealthStatus(
  overdueMilestones: Milestone[],
  overdueActionItems: ActionItem[],
  allMilestones: Milestone[],
): { healthStatus: DigestData["healthStatus"]; healthDetail: string } {
  // Check milestone health flags
  const redHealth = allMilestones.filter((m) => m.health === "Red");
  const yellowHealth = allMilestones.filter((m) => m.health === "Yellow");

  if (redHealth.length > 0 || overdueMilestones.length >= 3) {
    return {
      healthStatus: "off-track",
      healthDetail: [
        overdueMilestones.length > 0
          ? `${overdueMilestones.length} overdue milestone${overdueMilestones.length === 1 ? "" : "s"}`
          : "",
        redHealth.length > 0 ? `${redHealth.length} red-health item${redHealth.length === 1 ? "" : "s"}` : "",
        overdueActionItems.length > 0
          ? `${overdueActionItems.length} overdue action item${overdueActionItems.length === 1 ? "" : "s"}`
          : "",
      ]
        .filter(Boolean)
        .join(", "),
    };
  }

  if (yellowHealth.length > 0 || overdueMilestones.length > 0 || overdueActionItems.length >= 3) {
    return {
      healthStatus: "at-risk",
      healthDetail: [
        overdueMilestones.length > 0
          ? `${overdueMilestones.length} overdue milestone${overdueMilestones.length === 1 ? "" : "s"}`
          : "",
        yellowHealth.length > 0
          ? `${yellowHealth.length} yellow-health item${yellowHealth.length === 1 ? "" : "s"}`
          : "",
        overdueActionItems.length > 0
          ? `${overdueActionItems.length} overdue action item${overdueActionItems.length === 1 ? "" : "s"}`
          : "",
      ]
        .filter(Boolean)
        .join(", "),
    };
  }

  return { healthStatus: "on-track", healthDetail: "All milestones on schedule" };
}

// ---------------------------------------------------------------------------
// Date formatting helpers
// ---------------------------------------------------------------------------

function formatDateStr(d: Date): string {
  const m = d.getMonth() + 1;
  const day = d.getDate();
  const y = d.getFullYear();
  return `${m}/${day}/${y}`;
}

function formatDateShort(dateStr: string | undefined | null): string {
  if (!dateStr) return "No date";
  const d = parseLocalDate(dateStr);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// ---------------------------------------------------------------------------
// HTML email rendering
// ---------------------------------------------------------------------------

const HEALTH_COLORS: Record<DigestData["healthStatus"], { bg: string; text: string; label: string }> = {
  "on-track": { bg: "#DEF7EC", text: "#065F46", label: "On Track" },
  "at-risk": { bg: "#FEF3C7", text: "#92400E", label: "At Risk" },
  "off-track": { bg: "#FEE2E2", text: "#991B1B", label: "Off Track" },
};

export function generateDigestHtml(projectId: string, data: DigestData): string {
  const health = HEALTH_COLORS[data.healthStatus];

  const sections: string[] = [];

  // Health badge
  sections.push(`
    <div style="margin-bottom: 20px;">
      <span style="display: inline-block; background: ${health.bg}; color: ${health.text}; padding: 6px 14px; border-radius: 20px; font-weight: 600; font-size: 14px;">
        ${health.label}
      </span>
      ${data.healthDetail ? `<span style="color: #6B7280; font-size: 13px; margin-left: 8px;">${escapeHtml(data.healthDetail)}</span>` : ""}
    </div>
  `);

  // Summary stats row
  sections.push(`
    <table role="presentation" style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
      <tr>
        <td style="text-align: center; padding: 12px; background: #F9FAFB; border-radius: 6px;">
          <div style="font-size: 24px; font-weight: 700; color: #111827;">${data.openActionItems}</div>
          <div style="font-size: 12px; color: #6B7280;">Open Action Items</div>
        </td>
        <td style="width: 8px;"></td>
        <td style="text-align: center; padding: 12px; background: ${data.overdueActionItems > 0 ? "#FEE2E2" : "#F9FAFB"}; border-radius: 6px;">
          <div style="font-size: 24px; font-weight: 700; color: ${data.overdueActionItems > 0 ? "#DC2626" : "#111827"};">${data.overdueActionItems}</div>
          <div style="font-size: 12px; color: #6B7280;">Overdue Items</div>
        </td>
        <td style="width: 8px;"></td>
        <td style="text-align: center; padding: 12px; background: #F9FAFB; border-radius: 6px;">
          <div style="font-size: 24px; font-weight: 700; color: #111827;">${data.openQuestions}</div>
          <div style="font-size: 12px; color: #6B7280;">Open Questions</div>
        </td>
      </tr>
    </table>
  `);

  // Completed milestones
  if (data.completedMilestones.length > 0) {
    sections.push(renderSection(
      "Completed This Week",
      "#22C55E",
      data.completedMilestones.map(
        (m) => `<tr>
          <td style="padding: 8px 0; border-bottom: 1px solid #F3F4F6;">
            <span style="color: #22C55E; margin-right: 6px;">&#10003;</span>
            ${escapeHtml(m.name)}
          </td>
          <td style="padding: 8px 0; border-bottom: 1px solid #F3F4F6; text-align: right; color: #6B7280; font-size: 13px;">
            ${formatDateShort(m.endDate ?? m.date)}
          </td>
        </tr>`,
      ),
    ));
  }

  // Overdue milestones
  if (data.overdueMilestones.length > 0) {
    sections.push(renderSection(
      "Overdue Milestones",
      "#DC2626",
      data.overdueMilestones.map(
        (m) => `<tr>
          <td style="padding: 8px 0; border-bottom: 1px solid #F3F4F6;">
            <span style="color: #DC2626; margin-right: 6px;">&#9888;</span>
            ${escapeHtml(m.name)}
          </td>
          <td style="padding: 8px 0; border-bottom: 1px solid #F3F4F6; text-align: right; color: #DC2626; font-size: 13px;">
            Due ${formatDateShort(m.endDate ?? m.date)}
          </td>
        </tr>`,
      ),
    ));
  }

  // Upcoming milestones
  if (data.upcomingMilestones.length > 0) {
    sections.push(renderSection(
      "Upcoming Milestones (Next 14 Days)",
      "#D97706",
      data.upcomingMilestones.map(
        (m) => `<tr>
          <td style="padding: 8px 0; border-bottom: 1px solid #F3F4F6;">
            ${escapeHtml(m.name)}
            ${m.percentComplete != null ? `<span style="color: #9CA3AF; font-size: 12px; margin-left: 6px;">${Math.round(m.percentComplete * 100)}%</span>` : ""}
          </td>
          <td style="padding: 8px 0; border-bottom: 1px solid #F3F4F6; text-align: right; color: #D97706; font-size: 13px;">
            ${formatDateShort(m.endDate ?? m.date)}
          </td>
        </tr>`,
      ),
    ));
  }

  // New RAID items
  if (data.newRaidItems.length > 0) {
    const typeColors: Record<string, string> = {
      Risk: "#DC2626",
      Issue: "#D97706",
      Action: "#3B82F6",
      Decision: "#6B7280",
    };
    sections.push(renderSection(
      "New RAID Items",
      "#3B82F6",
      data.newRaidItems.map(
        (r) => `<tr>
          <td style="padding: 8px 0; border-bottom: 1px solid #F3F4F6;">
            <span style="display: inline-block; background: ${typeColors[r.type] ?? "#6B7280"}; color: white; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; margin-right: 6px;">${escapeHtml(r.type)}</span>
            ${escapeHtml(r.item)}
          </td>
          <td style="padding: 8px 0; border-bottom: 1px solid #F3F4F6; text-align: right; color: #6B7280; font-size: 13px;">
            ${escapeHtml(r.assigned || "Unassigned")}
          </td>
        </tr>`,
      ),
    ));
  }

  // Questions activity
  if (data.openQuestions > 0 || data.newQuestions > 0) {
    sections.push(`
      <div style="margin-bottom: 20px;">
        <h3 style="margin: 0 0 8px; font-size: 15px; color: #3B82F6; border-bottom: 2px solid #3B82F6; padding-bottom: 4px;">Questions</h3>
        <p style="margin: 0; color: #374151; font-size: 14px;">
          ${data.openQuestions} open question${data.openQuestions === 1 ? "" : "s"}${data.newQuestions > 0 ? `, ${data.newQuestions} new this week` : ""}
        </p>
      </div>
    `);
  }

  // No activity case
  if (
    data.completedMilestones.length === 0 &&
    data.overdueMilestones.length === 0 &&
    data.upcomingMilestones.length === 0 &&
    data.newRaidItems.length === 0 &&
    data.openQuestions === 0
  ) {
    sections.push(`
      <p style="color: #6B7280; font-style: italic; text-align: center; padding: 20px 0;">
        No notable activity this week.
      </p>
    `);
  }

  return `
    <div style="font-family: sans-serif; max-width: 640px; margin: 0 auto;">
      <div style="background: #F4333F; padding: 16px 24px; border-radius: 8px 8px 0 0;">
        <span style="color: white; font-weight: bold; font-size: 18px;">ESM Implementation Customer Hub</span>
      </div>
      <div style="background: #ffffff; padding: 24px; border: 1px solid #E5E7EB; border-top: 0; border-radius: 0 0 8px 8px;">
        <h2 style="margin: 0 0 4px; font-size: 20px; color: #111827;">Weekly Digest: ${escapeHtml(data.projectName)}</h2>
        <p style="margin: 0 0 20px; font-size: 13px; color: #9CA3AF;">${escapeHtml(data.customerName)} &middot; ${escapeHtml(data.periodStart)} &ndash; ${escapeHtml(data.periodEnd)}</p>
        ${sections.join("\n")}
        <p style="margin: 24px 0 0; font-size: 13px; color: #9CA3AF;">This notification was sent from ESM Implementation Customer Hub.</p>
      </div>
    </div>
  `;
}

function renderSection(title: string, color: string, rows: string[]): string {
  return `
    <div style="margin-bottom: 20px;">
      <h3 style="margin: 0 0 8px; font-size: 15px; color: ${color}; border-bottom: 2px solid ${color}; padding-bottom: 4px;">${escapeHtml(title)}</h3>
      <table role="presentation" style="width: 100%; border-collapse: collapse; font-size: 14px; color: #374151;">
        ${rows.join("\n")}
      </table>
    </div>
  `;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ---------------------------------------------------------------------------
// Send digests for all active projects
// ---------------------------------------------------------------------------

export async function sendWeeklyDigests(): Promise<DigestSummary> {
  const projects = getProjectList();
  const sent: DigestSendResult[] = [];
  const skipped: string[] = [];
  const errors: string[] = [];

  for (const project of projects) {
    // Skip inactive / completed projects
    if (project.status === "OFF_TRACK" && !project.currentPhase) {
      skipped.push(project.id);
      continue;
    }

    let data: DigestData | null;
    try {
      data = await generateDigestForProject(project.id);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`${project.id}: Failed to generate digest - ${msg}`);
      continue;
    }

    if (!data) {
      skipped.push(project.id);
      continue;
    }

    const html = generateDigestHtml(project.id, data);
    const subject = `Weekly Digest: ${project.projectName} (${data.periodStart} - ${data.periodEnd})`;

    // Build recipient list: SC + project contacts
    const recipients = new Set<string>();
    if (project.scEmail) recipients.add(project.scEmail);
    const contacts = getProjectContacts(project.id);
    for (const contact of contacts) {
      if (contact.email) recipients.add(contact.email);
    }

    if (recipients.size === 0) {
      skipped.push(project.id);
      continue;
    }

    const result: DigestSendResult = {
      projectId: project.id,
      customerName: project.customerName,
      recipients: [],
      errors: [],
    };

    for (const email of Array.from(recipients)) {
      const sendResult = await sendNotificationEmailSafe(email, subject, html);
      if (sendResult.sent) {
        result.recipients.push(email);
      } else {
        result.errors.push(`${email}: ${sendResult.error ?? "Unknown error"}`);
      }
    }

    if (result.recipients.length > 0) {
      logAudit(
        "system",
        "weekly_digest_sent",
        project.id,
        "notification",
        `Sent to ${result.recipients.length} recipient(s): ${result.recipients.join(", ")}`,
      );
    }

    sent.push(result);
  }

  return { sent, skipped, errors };
}
