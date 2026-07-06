import { NextRequest, NextResponse } from "next/server";
import { getProjectById, getSmartsheetConfig } from "@/lib/smartsheet-data";
import { collectWorkflowData } from "@/lib/documents/collect-workflow-data";
import { generateWorkflowDocx } from "@/lib/documents/workflow-docx";
import { attachFileToSheet } from "@/lib/smartsheet";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const project = getProjectById(id);
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const config = getSmartsheetConfig(id);
  if (!config.documentSheetId) {
    return NextResponse.json({ error: "No document sheet configured for this project" }, { status: 422 });
  }

  const workflowData = await collectWorkflowData(id);
  if (!workflowData) {
    return NextResponse.json(
      { error: "No processed uploads with workflow data found. Upload and process customer documents first." },
      { status: 422 },
    );
  }

  try {
    const safeName = project.customerName.replace(/[^a-zA-Z0-9]/g, "_");
    const fileName = `ESM_Workflow_${safeName}.docx`;
    const buffer = await generateWorkflowDocx(workflowData);

    const attachment = await attachFileToSheet(
      config.documentSheetId,
      fileName,
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      buffer,
    );

    return NextResponse.json({
      documentId: String(attachment.id),
      name: attachment.name,
      status: "READY",
      fileSize: buffer.length,
    });
  } catch (error) {
    console.error("Workflow DOCX generation failed:", error);
    return NextResponse.json(
      { error: "Failed to generate workflow DOCX" },
      { status: 500 },
    );
  }
}
