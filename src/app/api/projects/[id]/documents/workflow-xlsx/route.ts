import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getProjectById, getSmartsheetConfig } from "@/lib/smartsheet-data";
import { collectWorkflowData } from "@/lib/documents/collect-workflow-data";
import { generateWorkflowXlsx } from "@/lib/documents/workflow-xlsx";
import { attachFileToSheet } from "@/lib/smartsheet";

export async function POST(
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
    const fileName = `ESM_Workflow_${safeName}.xlsx`;
    const buffer = await generateWorkflowXlsx(workflowData);

    const attachment = await attachFileToSheet(
      config.documentSheetId,
      fileName,
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      buffer,
    );

    return NextResponse.json({
      documentId: String(attachment.id),
      name: attachment.name,
      status: "READY",
      fileSize: buffer.length,
    });
  } catch (error) {
    console.error("Workflow XLSX generation failed:", error);
    return NextResponse.json(
      { error: "Failed to generate workflow XLSX" },
      { status: 500 },
    );
  }
}
