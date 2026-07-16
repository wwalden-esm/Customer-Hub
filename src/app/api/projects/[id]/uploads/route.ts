import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getCustomerSession } from "@/lib/magic-link";
import { getProjectById, getSmartsheetConfig } from "@/lib/smartsheet-data";
import { generateWorkflowXlsx } from "@/lib/documents/workflow-xlsx";
import { generateWorkflowDocx } from "@/lib/documents/workflow-docx";
import { attachFileToSheet } from "@/lib/smartsheet";
import { extractWorkflowFromFiles } from "@/lib/documents/workflow-extract";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  const customerSession = await getCustomerSession();
  if (!session?.user && !customerSession) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const project = getProjectById(id);
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await extractWorkflowFromFiles([
      { name: file.name, size: file.size, buffer },
    ]);

    const extractedData = result.data;
    const generatedDocs: Array<{ name: string; type: string }> = [];
    const config = getSmartsheetConfig(id);
    const safeName = project.customerName.replace(/[^a-zA-Z0-9]/g, "_");

    if (config.documentSheetId) {
      try {
        const xlsxBuf = await generateWorkflowXlsx(extractedData);
        const xlsxName = `ESM_Workflow_${safeName}.xlsx`;
        await attachFileToSheet(
          config.documentSheetId,
          xlsxName,
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          xlsxBuf,
        );
        generatedDocs.push({ name: xlsxName, type: "workflow-xlsx" });
      } catch (e) {
        console.error("Workflow XLSX generation failed:", e);
      }

      try {
        const docxBuf = await generateWorkflowDocx(extractedData);
        const docxName = `ESM_Workflow_${safeName}.docx`;
        await attachFileToSheet(
          config.documentSheetId,
          docxName,
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          docxBuf,
        );
        generatedDocs.push({ name: docxName, type: "workflow-docx" });
      } catch (e) {
        console.error("Workflow DOCX generation failed:", e);
      }
    }

    return NextResponse.json({
      fileName: file.name,
      sizeBytes: file.size,
      processed: true,
      customerName: extractedData.customer_name,
      generatedDocs,
    });
  } catch (error) {
    console.error("Upload processing failed:", error);
    const message = error instanceof Error ? error.message : "Failed to process file with AI";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
