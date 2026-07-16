import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getCustomerSession } from "@/lib/magic-link";
import { getProjectById, getSmartsheetConfig } from "@/lib/smartsheet-data";
import {
  readWorkflowData,
  writeWorkflowData,
  ensureWorkflowDataSheet,
} from "@/lib/smartsheet-workflow";
import { attachFileToSheet } from "@/lib/smartsheet";
import {
  extractWorkflowFromFiles,
  type UploadedFile,
} from "@/lib/documents/workflow-extract";

const MIME_MAP: Record<string, string> = {
  ".pdf": "application/pdf",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ".xls": "application/vnd.ms-excel",
  ".csv": "text/csv",
  ".txt": "text/plain",
};

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
  const entries = formData.getAll("files");
  if (entries.length === 0) {
    return NextResponse.json({ error: "No files provided" }, { status: 400 });
  }

  const files: UploadedFile[] = [];
  for (const entry of entries) {
    if (!(entry instanceof File)) continue;
    files.push({
      name: entry.name,
      size: entry.size,
      buffer: Buffer.from(await entry.arrayBuffer()),
    });
  }

  if (files.length === 0) {
    return NextResponse.json({ error: "No valid files provided" }, { status: 400 });
  }

  const config = getSmartsheetConfig(id);

  try {
    // Load existing workflow data for merge context
    let existingData = null;
    let sheetId = config.workflowDataSheetId;
    if (sheetId) {
      try {
        existingData = await readWorkflowData(sheetId, project.customerName);
        const hasRules = Object.values(existingData.workflow_steps).some(
          s => s.active && s.rules.length > 0,
        );
        if (!hasRules) existingData = null;
      } catch {
        existingData = null;
      }
    }

    const result = await extractWorkflowFromFiles(files, existingData);

    // Force customer name from project config
    result.data.customer_name = project.customerName;

    // Save extracted data to Smartsheet
    if (!sheetId && config.customerFolderId) {
      sheetId = await ensureWorkflowDataSheet(
        id,
        config.customerFolderId,
        project.customerName,
      );
    }

    if (sheetId) {
      await writeWorkflowData(sheetId, result.data);
    }

    // Store source documents as attachments for reference
    if (config.documentSheetId) {
      for (const file of files) {
        const ext = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();
        const mime = MIME_MAP[ext] || "application/octet-stream";
        try {
          await attachFileToSheet(
            config.documentSheetId,
            `Source_${file.name}`,
            mime,
            file.buffer,
          );
        } catch (e) {
          console.error(`Failed to attach source file ${file.name}:`, e);
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: result.data,
      fileNames: result.fileNames,
      stepCount: result.stepCount,
      ruleCount: result.ruleCount,
      savedToSmartsheet: !!sheetId,
    });
  } catch (error) {
    console.error("Workflow extraction failed:", error);
    const message = error instanceof Error ? error.message : "Extraction failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
