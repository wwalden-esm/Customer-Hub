import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getProjectById, getSmartsheetConfig } from "@/lib/smartsheet-data";
import { generateTrainingGuide } from "@/lib/documents/training-guide";
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

  try {
    const { buffer, fileName } = await generateTrainingGuide(project);
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
      notice: "This document requires management review before distribution to the customer.",
    });
  } catch (error) {
    console.error("Training guide generation failed:", error);
    return NextResponse.json(
      { error: "Failed to generate training guide" },
      { status: 500 },
    );
  }
}
