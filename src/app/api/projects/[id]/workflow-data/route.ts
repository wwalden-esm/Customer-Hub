import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getProjectById, getSmartsheetConfig } from "@/lib/smartsheet-data";
import {
  readWorkflowData,
  writeWorkflowData,
  ensureWorkflowDataSheet,
} from "@/lib/smartsheet-workflow";
import { createEmptyWorkflowData } from "@/lib/documents/workflow-prompts";
import type { WorkflowData } from "@/lib/documents/workflow-prompts";

async function resolveSheetId(
  projectId: string,
  customerName: string,
): Promise<string | null> {
  const config = getSmartsheetConfig(projectId);
  if (config.workflowDataSheetId) return config.workflowDataSheetId;
  if (!config.customerFolderId) return null;
  return ensureWorkflowDataSheet(projectId, config.customerFolderId, customerName);
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const project = getProjectById(id);
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const sheetId = await resolveSheetId(id, project.customerName);
  if (!sheetId) {
    return NextResponse.json(createEmptyWorkflowData(project.customerName));
  }

  const data = await readWorkflowData(sheetId, project.customerName);
  return NextResponse.json(data);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const project = getProjectById(id);
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const sheetId = await resolveSheetId(id, project.customerName);
  if (!sheetId) {
    return NextResponse.json(
      { error: "No customer folder configured — cannot create workflow data sheet" },
      { status: 422 },
    );
  }

  let body: WorkflowData;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.workflow_steps || typeof body.workflow_steps !== "object") {
    return NextResponse.json(
      { error: "Missing workflow_steps in request body" },
      { status: 400 },
    );
  }

  const stepCount = Object.keys(body.workflow_steps).length;
  if (stepCount > 15) {
    return NextResponse.json(
      { error: "Maximum 15 workflow steps allowed" },
      { status: 400 },
    );
  }

  body.customer_name = project.customerName;

  try {
    await writeWorkflowData(sheetId, body);
    return NextResponse.json({ success: true, stepCount });
  } catch (error) {
    console.error("Failed to save workflow data:", error);
    return NextResponse.json(
      { error: "Failed to save workflow data to Smartsheet" },
      { status: 500 },
    );
  }
}
