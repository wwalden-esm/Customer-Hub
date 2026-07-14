import { NextRequest, NextResponse } from "next/server";
import { getProjectById } from "@/lib/smartsheet-data";
import { sendNotificationEmail } from "@/lib/email";
import { logAudit } from "@/lib/audit-log";

export async function POST(req: NextRequest) {
  const { projectId } = await req.json();

  if (!projectId) {
    return NextResponse.json({ error: "Project ID is required" }, { status: 400 });
  }

  const project = getProjectById(projectId);
  if (!project) {
    return NextResponse.json({ ok: true });
  }

  const scEmail = project.scEmail;
  if (!scEmail) {
    return NextResponse.json({ ok: true });
  }

  const subject = `[Customer Hub] Password Reset Request — ${project.customerName}`;
  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: #F4333F; padding: 16px 24px; border-radius: 8px 8px 0 0;">
        <span style="color: white; font-weight: bold; font-size: 18px;">Password Reset Request</span>
      </div>
      <div style="background: #ffffff; padding: 24px; border: 1px solid #e5e7eb; border-top: 0; border-radius: 0 0 8px 8px;">
        <p style="margin: 0 0 12px; font-size: 14px; color: #374151;">
          A customer on <strong>${project.customerName}</strong> (${project.projectName}) has requested a password reset for their Customer Hub portal.
        </p>
        <p style="margin: 0 0 12px; font-size: 14px; color: #374151;">
          To reset their password, update the project password in the Hub Configuration page for this project.
        </p>
        <p style="margin: 0; font-size: 13px; color: #9CA3AF;">
          This request was submitted via the Customer Hub login page.
        </p>
      </div>
    </div>
  `;

  if (process.env.RESEND_API_KEY) {
    try {
      await sendNotificationEmail(scEmail, subject, html);
    } catch (err) {
      console.error("[RESET] Failed to send reset email:", err);
    }
  } else {
    console.log(`[RESET] Would send reset request to ${scEmail} for ${project.customerName}`);
  }

  logAudit("customer", "password_reset_request", projectId, "auth", project.customerName);

  return NextResponse.json({ ok: true });
}
