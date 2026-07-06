import { NextRequest, NextResponse } from "next/server";
import { getProjectById, getSmartsheetConfig } from "@/lib/smartsheet-data";
import { generateUatTracker } from "@/lib/documents/uat-tracker";
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
    const fileName = `ESM_UAT_Tracker_${safeName}.xlsx`;
    const buffer = await generateUatTracker(project.customerName);

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
    console.error("UAT Tracker generation failed:", error);
    return NextResponse.json(
      { error: "Failed to generate UAT Tracker" },
      { status: 500 },
    );
  }
}
