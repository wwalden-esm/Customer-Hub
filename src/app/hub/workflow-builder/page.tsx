import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCustomerSession } from "@/lib/magic-link";
import { getSmartsheetConfig } from "@/lib/smartsheet-data";
import { getProjectById } from "@/lib/smartsheet-data";
import { readWorkflowData, ensureWorkflowDataSheet } from "@/lib/smartsheet-workflow";
import { createEmptyWorkflowData } from "@/lib/documents/workflow-prompts";
import WorkflowBuilderClient from "@/components/hub/workflow-builder/WorkflowBuilderClient";

export async function generateMetadata(): Promise<Metadata> {
  return { title: "Workflow Builder" };
}

export default async function WorkflowBuilderPage() {
  const session = await getCustomerSession();
  if (!session) redirect("/hub/login");

  const project = getProjectById(session.projectId);
  if (!project) redirect("/hub/login");

  const config = getSmartsheetConfig(session.projectId);

  let workflowData;
  let sheetId = config.workflowDataSheetId;

  if (!sheetId && config.customerFolderId) {
    sheetId = await ensureWorkflowDataSheet(
      session.projectId,
      config.customerFolderId,
      project.customerName,
    );
  }

  if (sheetId) {
    workflowData = await readWorkflowData(sheetId, project.customerName);
  } else {
    workflowData = createEmptyWorkflowData(project.customerName);
  }

  return (
    <WorkflowBuilderClient
      projectId={session.projectId}
      initialData={workflowData}
    />
  );
}
