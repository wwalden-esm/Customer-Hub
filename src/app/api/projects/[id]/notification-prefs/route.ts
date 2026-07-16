import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getCustomerSession } from "@/lib/magic-link";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";

const PREFS_FILE = join(process.cwd(), "config", "notification-prefs.json");

interface NotificationPrefs {
  emailEnabled: boolean;
  questionReplies: boolean;
  milestoneUpdates: boolean;
  meetingReminders: boolean;
}

const DEFAULT_PREFS: NotificationPrefs = {
  emailEnabled: true,
  questionReplies: true,
  milestoneUpdates: true,
  meetingReminders: true,
};

function loadAllPrefs(): Record<string, NotificationPrefs> {
  if (!existsSync(PREFS_FILE)) return {};
  try {
    return JSON.parse(readFileSync(PREFS_FILE, "utf-8"));
  } catch {
    return {};
  }
}

function saveAllPrefs(prefs: Record<string, NotificationPrefs>): void {
  writeFileSync(PREFS_FILE, JSON.stringify(prefs, null, 2) + "\n", "utf-8");
}

function prefsKey(projectId: string, email: string): string {
  return `${projectId}:${email}`;
}

export async function GET(req: NextRequest) {
  const session = await auth();
  const customerSession = await getCustomerSession();
  if (!session?.user && !customerSession) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const projectId = req.nextUrl.pathname.split("/")[3];
  const email = customerSession?.email || session?.user?.email || "";
  if (!email) {
    return NextResponse.json({ error: "No email in session" }, { status: 400 });
  }

  const all = loadAllPrefs();
  const key = prefsKey(projectId, email);
  const prefs = all[key] || DEFAULT_PREFS;

  return NextResponse.json({ prefs });
}

export async function PUT(req: NextRequest) {
  const session = await auth();
  const customerSession = await getCustomerSession();
  if (!session?.user && !customerSession) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const projectId = req.nextUrl.pathname.split("/")[3];
  const email = customerSession?.email || session?.user?.email || "";
  if (!email) {
    return NextResponse.json({ error: "No email in session" }, { status: 400 });
  }

  const body = await req.json();
  const prefs: NotificationPrefs = {
    emailEnabled: typeof body.emailEnabled === "boolean" ? body.emailEnabled : DEFAULT_PREFS.emailEnabled,
    questionReplies: typeof body.questionReplies === "boolean" ? body.questionReplies : DEFAULT_PREFS.questionReplies,
    milestoneUpdates: typeof body.milestoneUpdates === "boolean" ? body.milestoneUpdates : DEFAULT_PREFS.milestoneUpdates,
    meetingReminders: typeof body.meetingReminders === "boolean" ? body.meetingReminders : DEFAULT_PREFS.meetingReminders,
  };

  const all = loadAllPrefs();
  const key = prefsKey(projectId, email);
  all[key] = prefs;
  saveAllPrefs(all);

  return NextResponse.json({ prefs });
}
