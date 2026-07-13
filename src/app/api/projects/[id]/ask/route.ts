import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getCustomerSession } from "@/lib/magic-link";
import { getProjectById } from "@/lib/smartsheet-data";
import { sendNotificationEmail } from "@/lib/email";

export async function POST(req: NextRequest) {
  const session = await auth();
  const customerSession = await getCustomerSession();
  if (!session?.user && !customerSession) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const projectId = req.nextUrl.pathname.split("/")[3];
  const project = getProjectById(projectId);
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const body = await req.json();
  const { category, subject, message, senderName, senderEmail } = body;

  if (!message?.trim()) {
    return NextResponse.json({ error: "Message is required" }, { status: 400 });
  }

  const scEmail = project.scEmail;
  const saEmail = project.saEmail;
  const recipients = [scEmail, saEmail].filter(Boolean) as string[];

  if (recipients.length === 0) {
    return NextResponse.json({ error: "No team contacts configured" }, { status: 500 });
  }

  const htmlBody = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: #F4333F; padding: 16px 24px; border-radius: 8px 8px 0 0;">
        <span style="color: white; font-weight: bold; font-size: 18px;">Customer Hub — New Question</span>
      </div>
      <div style="background: #ffffff; padding: 24px; border: 1px solid #e5e7eb; border-top: 0; border-radius: 0 0 8px 8px;">
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 16px;">
          <tr>
            <td style="padding: 6px 12px 6px 0; color: #686468; font-size: 14px; vertical-align: top; white-space: nowrap;">From</td>
            <td style="padding: 6px 0; font-size: 14px;"><strong>${senderName}</strong> (${senderEmail})</td>
          </tr>
          <tr>
            <td style="padding: 6px 12px 6px 0; color: #686468; font-size: 14px; vertical-align: top; white-space: nowrap;">Project</td>
            <td style="padding: 6px 0; font-size: 14px;">${project.projectName}</td>
          </tr>
          <tr>
            <td style="padding: 6px 12px 6px 0; color: #686468; font-size: 14px; vertical-align: top; white-space: nowrap;">Category</td>
            <td style="padding: 6px 0; font-size: 14px;">${category}</td>
          </tr>
        </table>
        <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; padding: 16px; margin-bottom: 16px;">
          <p style="margin: 0; font-size: 14px; line-height: 1.6; white-space: pre-wrap;">${message.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</p>
        </div>
        <p style="color: #9ca3af; font-size: 12px; margin: 0;">
          Sent from the ESM Implementation Customer Hub
        </p>
      </div>
    </div>
  `;

  if (process.env.RESEND_API_KEY) {
    try {
      for (const recipient of recipients) {
        await sendNotificationEmail(recipient, subject, htmlBody);
      }
    } catch (err) {
      console.error("[ASK] Failed to send email:", err);
      return NextResponse.json({ error: "Failed to send email" }, { status: 500 });
    }
  } else {
    console.log(`[ASK] Email not configured — RESEND_API_KEY is empty`);
    console.log(`[ASK] Would send to: ${recipients.join(", ")}\nSubject: ${subject}\n`);
  }

  return NextResponse.json({ ok: true, subject, recipients: recipients.length });
}
