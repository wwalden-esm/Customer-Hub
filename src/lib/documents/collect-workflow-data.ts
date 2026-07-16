import { getProjectById, getSmartsheetConfig } from "@/lib/smartsheet-data";
import { readWorkflowData, ensureWorkflowDataSheet } from "@/lib/smartsheet-workflow";
import type { WorkflowData } from "./workflow-prompts";
import { createEmptyWorkflowData } from "./workflow-prompts";

export async function collectWorkflowData(projectId: string): Promise<WorkflowData | null> {
  const project = getProjectById(projectId);
  if (!project) return null;

  const config = getSmartsheetConfig(projectId);
  let sheetId = config.workflowDataSheetId;

  if (!sheetId) {
    if (!config.customerFolderId) {
      return createEmptyWorkflowData(project.customerName);
    }
    sheetId = await ensureWorkflowDataSheet(
      projectId,
      config.customerFolderId,
      project.customerName,
    );
  }

  const data = await readWorkflowData(sheetId, project.customerName);

  const hasRules = Object.values(data.workflow_steps).some(
    (step) => step.active && step.rules.length > 0,
  );
  if (!hasRules) return null;

  return data;
}
