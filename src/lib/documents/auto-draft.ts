import { getProjectById, getSmartsheetConfig, getProjectDocuments } from "@/lib/smartsheet-data";
import { readWorkflowData, ensureWorkflowDataSheet } from "@/lib/smartsheet-workflow";
import { validateWorkflowData } from "./workflow-validation";
import { generateWorkflowXlsx } from "./workflow-xlsx";
import { generateWorkflowDocx } from "./workflow-docx";
import { generateGoLiveChecklist } from "./go-live-checklist";
import { attachFileToSheet } from "@/lib/smartsheet";

async function hasDoc(documentSheetId: string, type: string): Promise<boolean> {
  const docs = await getProjectDocuments(documentSheetId);
  return docs.some((d) => d.type === type);
}

export async function checkAndAutoDraft(projectId: string): Promise<void> {
  const project = getProjectById(projectId);
  if (!project) return;

  const config = getSmartsheetConfig(projectId);
  if (!config.documentSheetId) return;

  const safeName = project.customerName.replace(/[^a-zA-Z0-9]/g, "_");

  let sheetId = config.workflowDataSheetId;
  if (!sheetId && config.customerFolderId) {
    sheetId = await ensureWorkflowDataSheet(projectId, config.customerFolderId, project.customerName);
  }

  if (sheetId) {
    const workflowData = await readWorkflowData(sheetId, project.customerName);

    if (workflowData.review_status === "approved" && validateWorkflowData(workflowData).valid) {
      if (!(await hasDoc(config.documentSheetId, "workflow-xlsx"))) {
        try {
          const buffer = await generateWorkflowXlsx(workflowData);
          await attachFileToSheet(
            config.documentSheetId,
            `ESM_Workflow_${safeName}.xlsx`,
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            buffer,
          );
        } catch (e) {
          console.error("Auto-draft workflow XLSX failed:", e);
        }
      }

      if (!(await hasDoc(config.documentSheetId, "workflow-docx"))) {
        try {
          const buffer = await generateWorkflowDocx(workflowData);
          await attachFileToSheet(
            config.documentSheetId,
            `ESM_Workflow_${safeName}.docx`,
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            buffer,
          );
        } catch (e) {
          console.error("Auto-draft workflow DOCX failed:", e);
        }
      }
    }
  }

  const latePhases = ["testing", "uat", "go-live", "live", "post-go-live"];
  if (latePhases.includes(project.currentPhase.toLowerCase())) {
    if (!(await hasDoc(config.documentSheetId, "go-live-checklist"))) {
      try {
        const { buffer } = await generateGoLiveChecklist(project);
        await attachFileToSheet(
          config.documentSheetId,
          `GoLive_Checklist_${safeName}.docx`,
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          buffer,
        );
      } catch (e) {
        console.error("Auto-draft go-live checklist failed:", e);
      }
    }
  }
}
