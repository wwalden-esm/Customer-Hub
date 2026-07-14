import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getCustomerSession } from "@/lib/magic-link";
import { getProjectById } from "@/lib/smartsheet-data";
import { getProjectMilestoneComments, addMilestoneComment } from "@/lib/milestone-comments";
import { sendNotificationEmail } from "@/lib/email";
import { logAudit } from "@/lib/audit-log";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  const customerSession = await getCustomerSession();
  if (!session?.user && !customerSession) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const comments = getProjectMilestoneComments(id);
  return NextResponse.json(comments);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  const customerSession = await getCustomerSession();
  if (!session?.user && !customerSession) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();
  const { milestoneId, milestoneName, message } = body;
  if (!milestoneId || !message?.trim()) {
    return NextResponse.json({ error: "milestoneId and message required" }, { status: 400 });
  }

  const authorName =
    body.authorName || session?.user?.name || customerSession?.name || "Unknown";
  const authorEmail =
    body.authorEmail || session?.user?.email || customerSession?.email || "unknown";

  const comment = addMilestoneComment(id, milestoneId, message.trim(), authorName, authorEmail);

  logAudit(authorEmail, "milestone_comment", id, "project", `${milestoneId}: ${message.trim().slice(0, 60)}`);

  const project = getProjectById(id);
  if (project && process.env.RESEND_API_KEY) {
    const isEsmStaff = [project.scEmail, project.saEmail, project.pmEmail]
      .filter(Boolean)
      .some((e) => e?.toLowerCase() === authorEmail.toLowerCase());

    const staffRecipients = [project.scEmail, project.saEmail, project.pmEmail]
      .filter(Boolean)
      .filter((e) => e!.toLowerCase() !== authorEmail.toLowerCase()) as string[];

    const customerContacts = [
      ...(project.contacts?.map((c) => c.email) || []),
      project.executiveSponsorEmail,
      project.projectChampionEmail,
    ].filter(Boolean).filter((e) => e!.toLowerCase() !== authorEmail.toLowerCase()) as string[];

    const staffHtml = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #F4333F; padding: 16px 24px; border-radius: 8px 8px 0 0;">
          <span style="color: white; font-weight: bold; font-size: 18px;">Customer Hub — New Milestone Comment</span>
        </div>
        <div style="background: #ffffff; padding: 24px; border: 1px solid #e5e7eb; border-top: 0; border-radius: 0 0 8px 8px;">
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 16px;">
            <tr>
              <td style="padding: 6px 12px 6px 0; color: #686468; font-size: 14px; vertical-align: top; white-space: nowrap;">From</td>
              <td style="padding: 6px 0; font-size: 14px;"><strong>${authorName}</strong> (${authorEmail})</td>
            </tr>
            <tr>
              <td style="padding: 6px 12px 6px 0; color: #686468; font-size: 14px; vertical-align: top; white-space: nowrap;">Project</td>
              <td style="padding: 6px 0; font-size: 14px;">${project.projectName}</td>
            </tr>
            <tr>
              <td style="padding: 6px 12px 6px 0; color: #686468; font-size: 14px; vertical-align: top; white-space: nowrap;">Milestone</td>
              <td style="padding: 6px 0; font-size: 14px;">${milestoneName || milestoneId}</td>
            </tr>
          </table>
          <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; padding: 16px; margin-bottom: 16px;">
            <p style="margin: 0; font-size: 14px; line-height: 1.6; white-space: pre-wrap;">${message.trim().replace(/</g, "&lt;").replace(/>/g, "&gt;")}</p>
          </div>
          <p style="color: #9ca3af; font-size: 12px; margin: 0;">Sent from the ESM Implementation Customer Hub</p>
        </div>
      </div>`;

    const customerHtml = `<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: #F4333F; padding: 16px 24px; border-radius: 8px 8px 0 0;">
        <span style="color: white; font-weight: bold; font-size: 18px;">New Communication</span>
      </div>
      <div style="background: #ffffff; padding: 24px; border: 1px solid #e5e7eb; border-top: 0; border-radius: 0 0 8px 8px;">
        <p style="font-size: 14px; color: #2D2826; margin: 0 0 8px;">You have a new communication with ESM regarding <strong>${project.projectName}</strong>.</p>
        <p style="font-size: 14px; color: #6B7280; margin: 0 0 16px;">Please log in to the Customer Hub to view the message.</p>
        <p style="color: #9ca3af; font-size: 12px; margin: 0;">ESM Implementation Customer Hub</p>
      </div>
    </div>`;

    try {
      for (const r of staffRecipients) {
        await sendNotificationEmail(r, `Milestone Comment — ${project.projectName}`, staffHtml);
      }
      if (!isEsmStaff) {
        // Customer posted — no notification back to them
      } else {
        // ESM staff posted — notify customer contacts
        for (const r of customerContacts) {
          await sendNotificationEmail(r, `New Communication — ${project.projectName}`, customerHtml);
        }
      }
    } catch (err) {
      console.error("[MILESTONE_COMMENT] Failed to send email:", err);
    }
  }

  return NextResponse.json(comment);
}
