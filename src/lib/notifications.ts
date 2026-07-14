import { getProjectList, getSmartsheetConfig, getProjectActionItems } from "@/lib/smartsheet-data";
import { sendNotificationEmail } from "@/lib/email";
import { parseLocalDate } from "@/lib/date-utils";
import type { ActionItem, Project } from "@/types/models";

interface ClassifiedItem {
  item: ActionItem;
  overdue: boolean;
  daysUntilDue: number;
}

interface ProjectNotification {
  project: Project;
  items: ClassifiedItem[];
}

export interface NotificationSummary {
  sent: Array<{ projectId: string; customerName: string; itemCount: number }>;
  skipped: number;
  errors: string[];
}

function classifyActionItems(items: ActionItem[], now: Date): ClassifiedItem[] {
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const classified: ClassifiedItem[] = [];

  for (const item of items) {
    if (!item.dueDate) continue;
    const status = item.status.toLowerCase();
    if (status === "complete" || status === "completed" || status === "done") continue;

    const due = parseLocalDate(item.dueDate);
    const daysUntilDue = Math.ceil((due.getTime() - todayStart.getTime()) / (1000 * 60 * 60 * 24));
    const overdue = daysUntilDue < 0;
    const upcoming = daysUntilDue >= 0 && daysUntilDue <= 3;

    if (overdue || upcoming) {
      classified.push({ item, overdue, daysUntilDue });
    }
  }

  classified.sort((a, b) => a.daysUntilDue - b.daysUntilDue);
  return classified;
}

function formatDueLabel(daysUntilDue: number): string {
  if (daysUntilDue < 0) {
    const absDays = Math.abs(daysUntilDue);
    return `${absDays} day${absDays === 1 ? "" : "s"} overdue`;
  }
  if (daysUntilDue === 0) return "Due today";
  if (daysUntilDue === 1) return "Due tomorrow";
  return `Due in ${daysUntilDue} days`;
}

function buildEmailHtml(project: Project, items: ClassifiedItem[]): string {
  const overdueItems = items.filter((i) => i.overdue);
  const upcomingItems = items.filter((i) => !i.overdue);

  const renderItemRows = (classified: ClassifiedItem[]) =>
    classified
      .map((c) => {
        const dueLabel = formatDueLabel(c.daysUntilDue);
        const badgeColor = c.overdue ? "#DC2626" : "#D97706";
        const badgeBg = c.overdue ? "#FEF2F2" : "#FFFBEB";
        return `
          <tr>
            <td style="padding: 10px 12px; border-bottom: 1px solid #E5E7EB; font-size: 14px; color: #1F2937;">${c.item.description}</td>
            <td style="padding: 10px 12px; border-bottom: 1px solid #E5E7EB; font-size: 14px; color: #6B7280;">${c.item.owner || "Unassigned"}</td>
            <td style="padding: 10px 12px; border-bottom: 1px solid #E5E7EB; font-size: 14px; color: #6B7280;">${c.item.dueDate || ""}</td>
            <td style="padding: 10px 12px; border-bottom: 1px solid #E5E7EB;">
              <span style="display: inline-block; padding: 2px 8px; border-radius: 12px; font-size: 12px; font-weight: 500; color: ${badgeColor}; background: ${badgeBg};">${dueLabel}</span>
            </td>
          </tr>`;
      })
      .join("");

  const tableHeader = `
    <tr>
      <th style="padding: 10px 12px; text-align: left; font-size: 12px; font-weight: 600; color: #6B7280; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 2px solid #E5E7EB;">Description</th>
      <th style="padding: 10px 12px; text-align: left; font-size: 12px; font-weight: 600; color: #6B7280; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 2px solid #E5E7EB;">Owner</th>
      <th style="padding: 10px 12px; text-align: left; font-size: 12px; font-weight: 600; color: #6B7280; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 2px solid #E5E7EB;">Due Date</th>
      <th style="padding: 10px 12px; text-align: left; font-size: 12px; font-weight: 600; color: #6B7280; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 2px solid #E5E7EB;">Status</th>
    </tr>`;

  let sections = "";

  if (overdueItems.length > 0) {
    sections += `
      <h3 style="margin: 24px 0 12px; font-size: 16px; color: #DC2626;">Overdue Items (${overdueItems.length})</h3>
      <table style="width: 100%; border-collapse: collapse; border: 1px solid #E5E7EB; border-radius: 6px;">
        ${tableHeader}
        ${renderItemRows(overdueItems)}
      </table>`;
  }

  if (upcomingItems.length > 0) {
    sections += `
      <h3 style="margin: 24px 0 12px; font-size: 16px; color: #D97706;">Upcoming Items (${upcomingItems.length})</h3>
      <table style="width: 100%; border-collapse: collapse; border: 1px solid #E5E7EB; border-radius: 6px;">
        ${tableHeader}
        ${renderItemRows(upcomingItems)}
      </table>`;
  }

  return `
    <div style="font-family: sans-serif; max-width: 640px; margin: 0 auto;">
      <div style="background: #F4333F; padding: 16px 24px; border-radius: 8px 8px 0 0;">
        <span style="color: white; font-weight: bold; font-size: 18px;">ESM Implementation Customer Hub</span>
      </div>
      <div style="background: #ffffff; padding: 24px; border: 1px solid #E5E7EB; border-top: 0; border-radius: 0 0 8px 8px;">
        <p style="margin: 0 0 4px; font-size: 16px; font-weight: 600; color: #1F2937;">${project.customerName}</p>
        <p style="margin: 0 0 16px; font-size: 14px; color: #6B7280;">${project.projectName}</p>
        <p style="margin: 0 0 8px; font-size: 14px; color: #374151;">
          You have <strong>${items.length}</strong> action item${items.length === 1 ? "" : "s"} that need${items.length === 1 ? "s" : ""} attention.
        </p>
        ${sections}
        <p style="margin: 24px 0 0; font-size: 13px; color: #9CA3AF;">This notification was sent from ESM Implementation Customer Hub.</p>
      </div>
    </div>`;
}

export async function sendDocumentNotification(
  project: Project,
  documentName: string,
  recipientEmail: string,
): Promise<void> {
  if (!process.env.RESEND_API_KEY) return;
  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: #F4333F; padding: 16px 24px; border-radius: 8px 8px 0 0;">
        <span style="color: white; font-weight: bold; font-size: 18px;">New Document Available</span>
      </div>
      <div style="background: #ffffff; padding: 24px; border: 1px solid #e5e7eb; border-top: 0; border-radius: 0 0 8px 8px;">
        <p style="font-size: 14px; color: #6B7280; margin: 0 0 8px;">Project: ${project.customerName}</p>
        <p style="font-size: 16px; font-weight: 600; color: #1F2937; margin: 0 0 16px;">
          A new document has been uploaded: <strong>${documentName}</strong>
        </p>
        <p style="font-size: 14px; color: #374151; margin: 0;">
          Visit your implementation hub to view and download the document.
        </p>
      </div>
    </div>`;
  await sendNotificationEmail(
    recipientEmail,
    `[${project.customerName}] New Document: ${documentName}`,
    html,
  );
}

export async function sendMeetingRecapNotification(
  project: Project,
  meetingTitle: string,
  recipientEmails: string[],
): Promise<void> {
  if (!process.env.RESEND_API_KEY) return;
  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: #F4333F; padding: 16px 24px; border-radius: 8px 8px 0 0;">
        <span style="color: white; font-weight: bold; font-size: 18px;">Meeting Recap Available</span>
      </div>
      <div style="background: #ffffff; padding: 24px; border: 1px solid #e5e7eb; border-top: 0; border-radius: 0 0 8px 8px;">
        <p style="font-size: 14px; color: #6B7280; margin: 0 0 8px;">Project: ${project.customerName}</p>
        <p style="font-size: 16px; font-weight: 600; color: #1F2937; margin: 0 0 16px;">${meetingTitle}</p>
        <p style="font-size: 14px; color: #374151; margin: 0;">
          A meeting recap has been posted. Visit your implementation hub to review the details and action items.
        </p>
      </div>
    </div>`;
  for (const email of recipientEmails) {
    try {
      await sendNotificationEmail(
        email,
        `[${project.customerName}] Meeting Recap: ${meetingTitle}`,
        html,
      );
    } catch (err) {
      console.error(`[NOTIFY] Failed recap email to ${email}:`, err);
    }
  }
}

export async function sendStatusChangeNotification(
  project: Project,
  newStatus: string,
  recipientEmail: string,
): Promise<void> {
  if (!process.env.RESEND_API_KEY) return;
  const statusLabel = newStatus.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  const statusColor = newStatus === "ON_TRACK" ? "#22c55e" : newStatus === "AT_RISK" ? "#eab308" : "#ef4444";
  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: #F4333F; padding: 16px 24px; border-radius: 8px 8px 0 0;">
        <span style="color: white; font-weight: bold; font-size: 18px;">Project Status Update</span>
      </div>
      <div style="background: #ffffff; padding: 24px; border: 1px solid #e5e7eb; border-top: 0; border-radius: 0 0 8px 8px;">
        <p style="font-size: 14px; color: #6B7280; margin: 0 0 8px;">Project: ${project.customerName}</p>
        <p style="font-size: 16px; margin: 0 0 16px;">
          Status changed to: <span style="color: ${statusColor}; font-weight: 600;">${statusLabel}</span>
        </p>
        <p style="font-size: 14px; color: #374151; margin: 0;">
          Visit your implementation hub for details.
        </p>
      </div>
    </div>`;
  await sendNotificationEmail(
    recipientEmail,
    `[${project.customerName}] Status: ${statusLabel}`,
    html,
  );
}

export async function checkAndSendNotifications(): Promise<NotificationSummary> {
  const summary: NotificationSummary = { sent: [], skipped: 0, errors: [] };
  const now = new Date();
  const allProjects = getProjectList();

  const projectNotifications: ProjectNotification[] = [];

  for (const project of allProjects) {
    const cfg = getSmartsheetConfig(project.id);
    if (!cfg.actionItemSheetId) {
      summary.skipped++;
      continue;
    }

    try {
      const items = await getProjectActionItems(cfg.actionItemSheetId);
      const classified = classifyActionItems(items, now);

      if (classified.length === 0) {
        summary.skipped++;
        continue;
      }

      projectNotifications.push({ project, items: classified });
    } catch (err) {
      summary.errors.push(`Failed to fetch action items for ${project.customerName}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  for (const { project, items } of projectNotifications) {
    if (!project.scEmail) {
      summary.errors.push(`No SC email for ${project.customerName}, skipping`);
      continue;
    }

    try {
      const overdueCount = items.filter((i) => i.overdue).length;
      const upcomingCount = items.length - overdueCount;
      const subjectParts: string[] = [];
      if (overdueCount > 0) subjectParts.push(`${overdueCount} overdue`);
      if (upcomingCount > 0) subjectParts.push(`${upcomingCount} upcoming`);
      const subject = `[${project.customerName}] Action Items: ${subjectParts.join(", ")}`;
      const html = buildEmailHtml(project, items);

      await sendNotificationEmail(project.scEmail, subject, html);
      summary.sent.push({ projectId: project.id, customerName: project.customerName, itemCount: items.length });
    } catch (err) {
      summary.errors.push(`Failed to send email for ${project.customerName}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  return summary;
}
