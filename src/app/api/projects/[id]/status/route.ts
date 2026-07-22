import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createJsonStore } from "@/lib/data-store";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const projectsStore = createJsonStore<Record<string, any>>("projects", {});

const VALID_STATUSES = ["ON_TRACK", "AT_RISK", "OFF_TRACK"];

export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const projectId = req.nextUrl.pathname.split("/")[3];

  const projects = projectsStore.load();

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
  projectsStore.save(projects);

  return NextResponse.json({ ok: true, status });
}
