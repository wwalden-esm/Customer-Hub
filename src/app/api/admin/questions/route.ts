import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getAllQuestions, getAllQuestionsAsync, replyToQuestion } from "@/lib/question-store";
import { getProjectById } from "@/lib/smartsheet-data";
import { sendNotificationEmail } from "@/lib/email";
import { logAudit } from "@/lib/audit-log";
import { addHubNotification } from "@/lib/hub-notification-store";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let questions;
  try {
    questions = await getAllQuestionsAsync();
  } catch {
    questions = getAllQuestions();
  }
  return NextResponse.json(questions);
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { questionId, reply } = await req.json();
  if (!questionId || !reply?.trim()) {
    return NextResponse.json({ error: "Question ID and reply are required" }, { status: 400 });
  }

  const repliedBy = session.user.name || session.user.email || "Staff";
  const question = await replyToQuestion(questionId, reply.trim(), repliedBy);
  if (!question) {
    return NextResponse.json({ error: "Question not found" }, { status: 404 });
  }

  logAudit(session.user.email || "unknown", "reply_question", question.projectId, "question", question.subject);

  const project = getProjectById(question.projectId);
  const projectName = project?.projectName || question.projectId;

  addHubNotification(
    question.projectId,
    "New Reply",
    `Your question "${question.subject}" has received a reply. View it in the Questions section.`,
  );

  if (question.senderEmail && process.env.RESEND_API_KEY) {
    const html = `<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: #F4333F; padding: 16px 24px; border-radius: 8px 8px 0 0;">
        <span style="color: white; font-weight: bold; font-size: 18px;">New Communication</span>
      </div>
      <div style="background: #ffffff; padding: 24px; border: 1px solid #e5e7eb; border-top: 0; border-radius: 0 0 8px 8px;">
        <p style="font-size: 14px; color: #2D2826; margin: 0 0 8px;">You have a new communication with ESM regarding <strong>${projectName}</strong>.</p>
        <p style="font-size: 14px; color: #6B7280; margin: 0 0 16px;">Please log into the Customer Hub to view the message.</p>
        <p style="color: #9ca3af; font-size: 12px; margin: 0;">ESM Implementation Customer Hub</p>
      </div>
    </div>`;
    try {
      console.log(`[REPLY] Sending reply notification email to ${question.senderEmail}`);
      await sendNotificationEmail(question.senderEmail, `New Communication — ${projectName}`, html);
      console.log(`[REPLY] Email sent successfully`);
    } catch (err) {
      console.error("[REPLY] Failed to send reply email:", err);
    }
  } else {
    console.log(`[REPLY] Email not sent — senderEmail: ${question.senderEmail}, RESEND_API_KEY set: ${!!process.env.RESEND_API_KEY}`);
  }

  return NextResponse.json(question);
}
