import { extractDataFromText } from "@/lib/claude";

export interface RecapActionItem {
  owner: string;
  task: string;
  due: string;
  type: "Customer" | "Internal";
}

export interface RecapDecision {
  title: string;
  description: string;
  made_by: string;
  type: "Config" | "Integration" | "Workflow" | "Scope" | "Timeline";
  impact: string;
}

export interface RecapRisk {
  description: string;
  owner: string;
  mitigation: string;
  priority: "High" | "Medium" | "Low";
}

export interface RecapResult {
  meeting_name: string;
  attendees: string;
  summary: string;
  action_items: RecapActionItem[];
  decisions: RecapDecision[];
  risks: RecapRisk[];
}

export function parseTranscriptFile(text: string): string {
  let cleaned = text;
  // Strip WEBVTT header and metadata lines
  cleaned = cleaned.replace(/^WEBVTT[^\n]*\n/m, "");
  cleaned = cleaned.replace(/^Kind:.*\n/m, "");
  cleaned = cleaned.replace(/^Language:.*\n/m, "");
  cleaned = cleaned.replace(/^NOTE[^\n]*\n(?:[^\n]+\n)*/gm, "");
  // Strip SRT sequence numbers + timecodes (comma ms separator)
  cleaned = cleaned.replace(/\d+\r?\n[\d:,]+ --> [\d:,]+[^\n]*\r?\n/g, "");
  // Strip VTT timecodes (dot ms separator, optional position metadata)
  cleaned = cleaned.replace(/[\d:.]+ --> [\d:.]+[^\n]*\r?\n/g, "");
  // Strip VTT cue identifiers (lines before timecodes that are just IDs)
  cleaned = cleaned.replace(/^[a-f0-9-]{36}\r?\n/gm, "");
  // Collapse blank lines
  cleaned = cleaned.replace(/\n{2,}/g, "\n");
  return cleaned.trim();
}

export async function processTranscript(
  transcript: string,
  customerName: string,
  meetingWeek: string,
  meetingDate: string,
): Promise<RecapResult> {
  const systemPrompt = `You are processing a meeting transcript for an ESM Solutions implementation project. Extract structured recap data including action items, decisions, and risks/open items. Be thorough — capture every actionable item mentioned.`;

  const userPrompt = `PROJECT: ${customerName}
MEETING: ${meetingWeek}
DATE: ${meetingDate}

Return a JSON object with this exact shape:

{
  "meeting_name": "concise title, e.g. \\"Jackson State — Weekly Implementation Call\\"",
  "attendees": "comma-separated names and roles found in transcript",
  "summary": "2–4 sentence client-facing narrative of what was discussed",
  "action_items": [
    {
      "owner": "person name",
      "task": "clear description of what needs to be done",
      "due": "date string or TBD",
      "type": "Customer or Internal"
    }
  ],
  "decisions": [
    {
      "title": "short decision title",
      "description": "full explanation of the decision",
      "made_by": "person name",
      "type": "Config or Integration or Workflow or Scope or Timeline",
      "impact": "brief impact statement"
    }
  ],
  "risks": [
    {
      "description": "risk or open item description",
      "owner": "person responsible",
      "mitigation": "planned mitigation or next step",
      "priority": "High or Medium or Low"
    }
  ]
}

Process the transcript below:`;

  return extractDataFromText<RecapResult>(transcript, systemPrompt, userPrompt);
}

const BAR = "============================================================";

function section(title: string): string[] {
  return ["", BAR, `  ${title}`, BAR, ""];
}

const SIGNATURE =
  "\n\nBest regards,\n\n" +
  "Whitney Walden\n" +
  "Senior Solutions Consultant\n" +
  "wwalden@esmsolutions.com\n" +
  "ESM Solutions\n" +
  "2001 Market Street Suite 2500\n" +
  "Philadelphia, PA 19103";

export function buildRecapEmailBody(
  recap: RecapResult,
  contactName: string,
  meetingDate: string,
): string {
  const lines: string[] = [];

  lines.push(`Hi ${contactName || "Team"},`);
  lines.push("");
  lines.push(
    "Thank you for joining yesterday's session. " +
    "Please find a summary of what was covered below.",
  );

  // Meeting Details
  lines.push(...section("MEETING DETAILS"));
  lines.push(`  Meeting:    ${recap.meeting_name}`);
  lines.push(`  Date:       ${meetingDate}`);
  lines.push(`  Attendees:  ${recap.attendees}`);

  // Discussion Summary
  lines.push(...section("DISCUSSION SUMMARY"));
  lines.push(`  ${recap.summary}`);

  // Action Items
  lines.push(...section("ACTION ITEMS"));
  for (const ai of recap.action_items) {
    const owner = ai.owner.toUpperCase();
    lines.push(`  *  [ ${owner} ]  ${ai.task}`);
    lines.push(`               Due: ${ai.due}  |  ${ai.type}`);
    lines.push("");
  }

  // Decisions Made
  lines.push(...section("DECISIONS MADE"));
  for (const d of recap.decisions) {
    lines.push(`  *  ${d.description}`);
  }
  lines.push("");

  return lines.join("\n") + SIGNATURE;
}

function escHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function buildEml(
  to: string,
  subject: string,
  body: string,
  fromName: string,
  fromEmail: string,
): string {
  const boundary = "----=_Part_ESM_" + Date.now().toString(36);
  const htmlBody = `<html><body style="margin:0;padding:20px;background:#fff;">
<pre style="font-family:Consolas,'Courier New',monospace;font-size:13px;line-height:1.5;color:#1a1a1a;white-space:pre-wrap;word-wrap:break-word;">${escHtml(body)}</pre>
</body></html>`;

  const lines = [
    `From: "${fromName}" <${fromEmail}>`,
    `To: ${to}`,
    `Subject: ${subject}`,
    `MIME-Version: 1.0`,
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    `X-Unsent: 1`,
    ``,
    `--${boundary}`,
    `Content-Type: text/plain; charset="utf-8"`,
    `Content-Transfer-Encoding: 7bit`,
    ``,
    body,
    ``,
    `--${boundary}`,
    `Content-Type: text/html; charset="utf-8"`,
    `Content-Transfer-Encoding: 7bit`,
    ``,
    htmlBody,
    ``,
    `--${boundary}--`,
  ];

  return lines.join("\r\n");
}
