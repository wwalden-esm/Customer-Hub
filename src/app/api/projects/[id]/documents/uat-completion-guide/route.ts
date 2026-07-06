import { NextRequest, NextResponse } from "next/server";
import { getProjectById, getSmartsheetConfig } from "@/lib/smartsheet-data";
import { generateUatCompletionGuide } from "@/lib/documents/uat-completion-guide";
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

  try {
    const safeName = project.customerName.replace(/[^a-zA-Z0-9]/g, "_");
    const fileName = `Purchase_UAT_Completion_Guide_${safeName}.docx`;
    const buffer = await generateUatCompletionGuide(
      project.customerName,
      project.scName,
      project.scEmail,
    );

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
    console.error("UAT Completion Guide generation failed:", error);
    return NextResponse.json(
      { error: "Failed to generate UAT Completion Guide" },
      { status: 500 },
    );
  }
}
