import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import fs from "fs";
import path from "path";

const configPath = path.join(process.cwd(), "config", "projects.json");

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();

  const required = ["customerName", "projectName", "products", "scEmail", "currentPhase", "status", "password"] as const;
  for (const field of required) {
    if (!body[field]) {
      return NextResponse.json({ error: `Missing required field: ${field}` }, { status: 400 });
    }
  }

  const projectId = slugify(body.customerName);
  if (!projectId) {
    return NextResponse.json({ error: "Invalid customer name" }, { status: 400 });
  }

  const raw = fs.readFileSync(configPath, "utf-8");
  const projects = JSON.parse(raw);

  if (projects[projectId]) {
    return NextResponse.json({ error: "A project with this customer name already exists" }, { status: 409 });
  }

  const products = Array.isArray(body.products)
    ? body.products
    : body.products.split(",").map((p: string) => p.trim()).filter(Boolean);

  projects[projectId] = {
    customerName: body.customerName,
    projectName: body.projectName,
    products,
    scName: body.scName || "",
    scEmail: body.scEmail,
    saName: body.saName || "",
    saEmail: body.saEmail || "",
    pmName: body.pmName || "",
    pmEmail: body.pmEmail || "",
    executiveSponsorName: body.executiveSponsorName || "",
    executiveSponsorEmail: body.executiveSponsorEmail || "",
    projectChampionName: body.projectChampionName || "",
    projectChampionEmail: body.projectChampionEmail || "",
    startDate: new Date().toISOString().split("T")[0],
    goLiveDate: body.goLiveDate || "",
    currentPhase: body.currentPhase,
    status: body.status,
    branding: {
      accentColor: body.accentColor || "#1E3A5F",
    },
    smartsheetConfig: {},
    sectionVisibility: {},
    links: [],
    contacts: [],
    password: body.password,
  };

  fs.writeFileSync(configPath, JSON.stringify(projects, null, 2));

  return NextResponse.json({ id: projectId, ...projects[projectId] }, { status: 201 });
}
