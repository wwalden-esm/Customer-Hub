import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import fs from "fs";
import path from "path";

const configPath = path.join(process.cwd(), "config", "projects.json");

const VALID_STATUSES = ["ON_TRACK", "AT_RISK", "OFF_TRACK"];

export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const projectId = req.nextUrl.pathname.split("/")[3];

  const raw = fs.readFileSync(configPath, "utf-8");
  const projects = JSON.parse(raw);

  if (!projects[projectId]) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const body = await req.json();
  const status = body.status;

  if (!VALID_STATUSES.includes(status)) {
    return NextResponse.json(
      { error: "Status must be ON_TRACK, AT_RISK, or OFF_TRACK" },
      { status: 400 },
    );
  }

  projects[projectId].status = status;
  fs.writeFileSync(configPath, JSON.stringify(projects, null, 2));

  return NextResponse.json({ ok: true, status });
}
