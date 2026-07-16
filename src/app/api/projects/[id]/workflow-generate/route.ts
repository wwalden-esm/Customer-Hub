import { NextRequest, NextResponse } from "next/server";
import { getCustomerSession } from "@/lib/magic-link";
import { getProjectById, getSmartsheetConfig } from "@/lib/smartsheet-data";
import { readWorkflowData, ensureWorkflowDataSheet } from "@/lib/smartsheet-workflow";
import { generateWorkflowXlsx } from "@/lib/documents/workflow-xlsx";
import { generateWorkflowDocx } from "@/lib/documents/workflow-docx";
import { attachFileToSheet } from "@/lib/smartsheet";
import { validateWorkflowData } from "@/lib/documents/workflow-validation";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getCustomerSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  // Ensure the customer can only access their own project
  if (session.projectId !== id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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

  if (!config.documentSheetId) {
    return NextResponse.json(
      { error: "No document sheet configured for this project" },
      { status: 422 },
    );
  }

  const workflowData = await readWorkflowData(sheetId, project.customerName);

  // Validate
  const validation = validateWorkflowData(workflowData);
  if (!validation.valid) {
    return NextResponse.json(
      { error: "Workflow data has validation errors", validationErrors: validation.errors },
      { status: 422 },
    );
  }

  // Check review status
  if (workflowData.review_status !== "approved") {
    return NextResponse.json(
      { error: "Workflow must be approved before generating documents" },
      { status: 422 },
    );
  }

  try {
    const safeName = project.customerName.replace(/[^a-zA-Z0-9]/g, "_");
    const results: { xlsx?: { id: string; name: string; size: number }; docx?: { id: string; name: string; size: number } } = {};

    // Generate XLSX
    const xlsxFileName = `ESM_Workflow_${safeName}.xlsx`;
    const xlsxBuffer = await generateWorkflowXlsx(workflowData);
    const xlsxAttachment = await attachFileToSheet(
      config.documentSheetId,
      xlsxFileName,
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      xlsxBuffer,
    );
    results.xlsx = {
      id: String(xlsxAttachment.id),
      name: xlsxAttachment.name,
      size: xlsxBuffer.length,
    };

    // Generate DOCX
    const docxFileName = `ESM_Workflow_${safeName}.docx`;
    const docxBuffer = await generateWorkflowDocx(workflowData);
    const docxAttachment = await attachFileToSheet(
      config.documentSheetId,
      docxFileName,
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      docxBuffer,
    );
    results.docx = {
      id: String(docxAttachment.id),
      name: docxAttachment.name,
      size: docxBuffer.length,
    };

    return NextResponse.json({
      success: true,
      documents: results,
    });
  } catch (error) {
    console.error("Workflow document generation failed:", error);
    return NextResponse.json(
      { error: "Failed to generate workflow documents" },
      { status: 500 },
    );
  }
}
