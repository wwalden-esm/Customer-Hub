import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getProjectById, getSmartsheetConfig } from "@/lib/smartsheet-data";
import { readWorkflowData, writeWorkflowData, ensureWorkflowDataSheet } from "@/lib/smartsheet-workflow";
import { addHubNotification } from "@/lib/hub-notification-store";

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

  const config = getSmartsheetConfig(id);
  const sheetId = config.workflowDataSheetId;
  if (!sheetId) {
    return NextResponse.json({ review_status: null });
  }

  const data = await readWorkflowData(sheetId, project.customerName);
  return NextResponse.json({
    review_status: data.review_status ?? "draft",
    review_notes: data.review_notes ?? "",
  });
}

export async function PATCH(
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

  const config = getSmartsheetConfig(id);
  let sheetId = config.workflowDataSheetId;
  if (!sheetId) {
    if (!config.customerFolderId) {
      return NextResponse.json(
        { error: "No customer folder configured" },
        { status: 422 },
      );
    }
    sheetId = await ensureWorkflowDataSheet(id, config.customerFolderId, project.customerName);
  }

  let body: { action: "approve" | "request_changes"; notes?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (body.action !== "approve" && body.action !== "request_changes") {
    return NextResponse.json(
      { error: "action must be 'approve' or 'request_changes'" },
      { status: 400 },
    );
  }

  try {
    const data = await readWorkflowData(sheetId, project.customerName);

    if (body.action === "approve") {
      data.review_status = "approved";
      data.review_notes = body.notes ?? "";
      addHubNotification(
        id,
        "Workflow Approved",
        "Your workflow configuration has been approved. You can now generate documents.",
      );
    } else {
      data.review_status = "changes_requested";
      data.review_notes = body.notes ?? "";
      addHubNotification(
        id,
        "Workflow Changes Requested",
        body.notes
          ? `Changes requested on your workflow: ${body.notes}`
          : "Changes have been requested on your workflow configuration.",
      );
    }

    await writeWorkflowData(sheetId, data);

    return NextResponse.json({
      success: true,
      review_status: data.review_status,
    });
  } catch (error) {
    console.error("Workflow review update failed:", error);
    return NextResponse.json(
      { error: "Failed to update review status" },
      { status: 500 },
    );
  }
}
