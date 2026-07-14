import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { loadMeetingTemplates, saveMeetingTemplates } from "@/lib/meeting-templates";
import type { MeetingTemplate } from "@/lib/meeting-templates";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json(loadMeetingTemplates());
}

export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const templates: MeetingTemplate[] = await req.json();
  saveMeetingTemplates(templates);
  return NextResponse.json({ ok: true });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const template: MeetingTemplate = await req.json();
  if (!template.id || !template.name) {
    return NextResponse.json({ error: "id and name required" }, { status: 400 });
  }

  const all = loadMeetingTemplates();
  const idx = all.findIndex((t) => t.id === template.id);
  if (idx >= 0) {
    all[idx] = template;
  } else {
    all.push(template);
  }
  saveMeetingTemplates(all);
  return NextResponse.json(template);
}
