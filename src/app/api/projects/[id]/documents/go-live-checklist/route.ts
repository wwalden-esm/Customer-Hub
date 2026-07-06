import { NextRequest, NextResponse } from "next/server";
import { getProjectById, getSmartsheetConfig } from "@/lib/smartsheet-data";
import { generateGoLiveChecklist } from "@/lib/documents/go-live-checklist";
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
    const { buffer, fileName } = await generateGoLiveChecklist(project);
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
    console.error("Go-live checklist generation failed:", error);
    return NextResponse.json(
      { error: "Failed to generate go-live checklist" },
      { status: 500 },
    );
  }
}
