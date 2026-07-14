import { Resend } from "resend";
import { logAudit } from "@/lib/audit-log";

let _resend: Resend | null = null;
function getResend(): Resend {
  if (!_resend) _resend = new Resend(process.env.RESEND_API_KEY);
  return _resend;
}

function getFrom(): string {
  return process.env.EMAIL_FROM || "ESM Implementation Customer Hub <hub@esmsolutions.com>";
}

export async function sendMagicLinkEmail(to: string, customerName: string, link: string) {
  await getResend().emails.send({
    from: getFrom(),
    to,
    subject: `Sign in to your ${customerName} implementation hub`,
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <div style="background: #F4333F; padding: 16px 24px; border-radius: 8px 8px 0 0;">
          <span style="color: white; font-weight: bold; font-size: 18px;">ESM Implementation Customer Hub</span>
        </div>
        <div style="background: #ffffff; padding: 24px; border: 1px solid #e5e7eb; border-top: 0; border-radius: 0 0 8px 8px;">
          <p>Click the link below to access the <strong>${customerName}</strong> implementation hub.</p>
          <p style="margin: 24px 0;">
            <a href="${link}" style="background: #F4333F; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 500;">
              Sign in to your hub
            </a>
          </p>
          <p style="color: #686468; font-size: 14px;">This link expires in 24 hours. If you didn't request this, you can ignore this email.</p>
        </div>
      </div>
    `,
  });
}

export async function sendNotificationEmail(to: string, subject: string, html: string) {
  const result = await getResend().emails.send({ from: getFrom(), to, subject, html });
  if ("error" in result && result.error) {
    console.error(`[EMAIL] Resend error sending to ${to}:`, result.error);
    logAudit("system", "email_failed", to, "email", subject);
    throw new Error(`Resend error: ${JSON.stringify(result.error)}`);
  }
  console.log(`[EMAIL] Sent to ${to}: "${subject}"`);
  return result;
}

export async function sendNotificationEmailSafe(
  to: string,
  subject: string,
  html: string,
): Promise<{ sent: boolean; error?: string }> {
  try {
    await sendNotificationEmail(to, subject, html);
    return { sent: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { sent: false, error: message };
  }
}
