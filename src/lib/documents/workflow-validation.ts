import type { WorkflowData } from "./workflow-prompts";

export interface ValidationError {
  stepKey: string;
  ruleIndex: number;
  field: string;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

export function validateWorkflowData(data: WorkflowData): ValidationResult {
  const errors: ValidationError[] = [];

  // customer_name must be non-empty
  if (!data.customer_name?.trim()) {
    errors.push({
      stepKey: "",
      ruleIndex: -1,
      field: "customer_name",
      message: "Customer name is required",
    });
  }

  // At least 1 active step with at least 1 rule
  const activeSteps = Object.entries(data.workflow_steps).filter(
    ([, step]) => step.active && step.rules.length > 0,
  );

  if (activeSteps.length === 0) {
    errors.push({
      stepKey: "",
      ruleIndex: -1,
      field: "workflow_steps",
      message: "At least one active step with at least one rule is required",
    });
  }

  // Validate each active step's rules
  for (const [stepKey, step] of Object.entries(data.workflow_steps)) {
    if (!step.active) continue;

    for (let i = 0; i < step.rules.length; i++) {
      const rule = step.rules[i];

      if (!rule.workflow_name?.trim()) {
        errors.push({
          stepKey,
          ruleIndex: i,
          field: "workflow_name",
          message: `Step "${step.label}" rule ${i + 1}: Workflow name is required`,
        });
      }

      if (!rule.approver_1_name?.trim()) {
        errors.push({
          stepKey,
          ruleIndex: i,
          field: "approver_1_name",
          message: `Step "${step.label}" rule ${i + 1}: Approver 1 name is required`,
        });
      }

      if (!rule.approver_1_email?.trim()) {
        errors.push({
          stepKey,
          ruleIndex: i,
          field: "approver_1_email",
          message: `Step "${step.label}" rule ${i + 1}: Approver 1 email is required`,
        });
      }
    }
  }

  return { valid: errors.length === 0, errors };
}
