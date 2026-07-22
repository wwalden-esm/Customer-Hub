import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getSettings, saveSettings, Settings } from "@/lib/settings";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json(getSettings());
}

export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const settings: Settings = getSettings();

  if (body.globalLinks !== undefined) {
    settings.globalLinks = body.globalLinks;
  }

  if (body.defaultAccentColor !== undefined) {
    settings.defaultAccentColor = body.defaultAccentColor;
  }

  if (body.allowCustomerRaidSubmissions !== undefined) {
    settings.allowCustomerRaidSubmissions = body.allowCustomerRaidSubmissions;
  }

  saveSettings(settings);
  return NextResponse.json({ ok: true });
}
