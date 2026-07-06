import { getProjectById } from "@/lib/smartsheet-data";
import type { WorkflowData } from "./workflow-prompts";

export async function collectWorkflowData(projectId: string): Promise<WorkflowData | null> {
  const project = getProjectById(projectId);
  if (!project) return null;

  return {
    customer_name: project.customerName,
    gl_system: "",
    fund_codes: "",
    org_codes: "",
    workflow_steps: {},
    additional_notes: "",
  };
}
