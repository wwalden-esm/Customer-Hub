import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import fs from "fs";
import path from "path";

const settingsPath = path.join(process.cwd(), "config", "settings.json");

function readSettings(): Record<string, unknown> {
  try {
    return JSON.parse(fs.readFileSync(settingsPath, "utf-8"));
  } catch {
    return { globalLinks: [] };
  }
}

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json(readSettings());
}

export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const settings = readSettings();

  if (body.globalLinks !== undefined) {
    settings.globalLinks = body.globalLinks;
  }

  fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
  return NextResponse.json({ ok: true });
}
