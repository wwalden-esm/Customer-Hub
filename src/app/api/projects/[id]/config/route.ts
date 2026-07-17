import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import fs from "fs";
import path from "path";

const configPath = path.join(process.cwd(), "config", "projects.json");

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

  if (body.branding) {
    projects[projectId].branding = {
      ...projects[projectId].branding,
      ...body.branding,
    };
  }
  if (body.password !== undefined) {
    projects[projectId].password = body.password;
  }
  if (body.sectionVisibility !== undefined) {
    projects[projectId].sectionVisibility = body.sectionVisibility;
  }
  if (body.documentTypes !== undefined) {
    projects[projectId].documentTypes = body.documentTypes;
  }
  if (body.links !== undefined) {
    projects[projectId].links = body.links;
  }
  if (body.contacts !== undefined) {
    projects[projectId].contacts = body.contacts;
  }
  if (body.allowCustomerRaidSubmissions !== undefined) {
    projects[projectId].allowCustomerRaidSubmissions = body.allowCustomerRaidSubmissions;
  }

  fs.writeFileSync(configPath, JSON.stringify(projects, null, 2));

  return NextResponse.json({ ok: true });
}
