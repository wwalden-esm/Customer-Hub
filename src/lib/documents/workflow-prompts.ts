export const WORKFLOW_EXTRACTION_SYSTEM = `You are a data extraction specialist for ESM Solutions, a procurement software company. Your task is to extract structured workflow approval data from customer documents. These documents may include policy manuals, approval matrices, org charts, and procurement guidelines.

RULES:
- Extract ONLY information that is explicitly stated in the documents
- Do NOT fabricate or infer data that is not present
- If information is partially available, include what you have and add "[SAMPLE - verify details]" in the notes field
- Every active step MUST have at least one rule. If a step appears active but has no clear rules, create one rule with "[SAMPLE - verify details]" markers
- Approver email addresses must be exact as found in the document; do not guess email formats
- Threshold amounts should be numeric values only (no currency symbols)
- The "operator" between approvers should be one of: "NEXT" (sequential), "AND" (all must approve), or "OR" (any one approves)
- Step names should match the customer's own terminology (e.g., "College Business Officer", "Associate Provost"), not generic titles
- Determine the number of steps and their order from the documents — do NOT force a fixed step count
- Any step may or may not use dollar thresholds — determine this from the documents, not from a template`;

export const WORKFLOW_EXTRACTION_USER = `Analyze the following customer documents and extract the procurement workflow approval rules.

Determine the customer's actual approval hierarchy from their documents. Each institution is different:
- Some have 3 steps, some have 12
- Step names are institution-specific (e.g., "Budget Manager", "College Dean", "Board of Trustees")
- ANY step may or may not use dollar thresholds — determine this from the documents
- Steps should be ordered by their position in the approval chain (first approver = step1, etc.)
- Priority is auto-assigned: step1 = 100, step2 = 200, step3 = 300, etc.

Each rule in a step represents one approval routing. A rule has:
- workflow_name: unique name for this rule (max 50 chars)
- fund_code: Segment 1 value (leave empty if not applicable)
- org_code: Segment 2 / Organization Code value (leave empty if not applicable)
- other_criteria: Account Code, Auxiliary Field, or other trigger criteria
- transaction_total: minimum dollar amount triggering this step (null if this step does not use dollar thresholds)
- approver_1_email, approver_1_name: primary approver (required)
- approver_1_2_operator: "NEXT", "AND", or "OR" - relationship between approver 1 and 2
- approver_2_email, approver_2_name: second approver (optional)
- approver_2_3_operator: relationship between approver 2 and 3
- approver_3_email, approver_3_name: third approver (optional)
- notes: any additional information

Return ONLY valid JSON matching this schema:

\`\`\`json
{
  "customer_name": "string - the institution/customer name",
  "gl_system": "string - their GL/ERP system name (e.g., Banner, PeopleSoft, Workday)",
  "fund_codes": "string - description of fund code structure identified",
  "org_codes": "string - description of org code structure identified",
  "workflow_steps": {
    "step1": {
      "active": true,
      "label": "string - the customer's own name for this approval level",
      "priority": 100,
      "has_threshold": false,
      "rules": [
        {
          "workflow_name": "string",
          "fund_code": "string or empty",
          "org_code": "string or empty",
          "other_criteria": "string or empty",
          "transaction_total": null,
          "approver_1_email": "string",
          "approver_1_name": "string",
          "approver_1_2_operator": "NEXT",
          "approver_2_email": "string or empty",
          "approver_2_name": "string or empty",
          "approver_2_3_operator": "string or empty",
          "approver_3_email": "string or empty",
          "approver_3_name": "string or empty",
          "notes": "string"
        }
      ]
    }
  },
  "additional_notes": "string - any other relevant information found in the documents"
}
\`\`\`

Only include steps that are mentioned in the documents. Use keys "step1", "step2", etc. in the order they appear in the approval chain. Set "active" to true for all steps you include — omit steps that don't exist for this customer rather than marking them inactive. Maximum 15 steps.`;

export interface WorkflowRule {
  workflow_name: string;
  fund_code: string;
  org_code: string;
  other_criteria: string;
  transaction_total: number | null;
  approver_1_email: string;
  approver_1_name: string;
  approver_1_2_operator: string;
  approver_2_email: string;
  approver_2_name: string;
  approver_2_3_operator: string;
  approver_3_email: string;
  approver_3_name: string;
  notes: string;
}

export interface WorkflowStep {
  active: boolean;
  label: string;
  priority: number;
  has_threshold: boolean;
  rules: WorkflowRule[];
}

export interface WorkflowData {
  customer_name: string;
  gl_system: string;
  fund_codes: string;
  org_codes: string;
  workflow_steps: Record<string, WorkflowStep>;
  additional_notes: string;
  review_status?: "draft" | "submitted" | "approved" | "changes_requested";
  review_notes?: string;
}

export const EMPTY_RULE: WorkflowRule = {
  workflow_name: "",
  fund_code: "",
  org_code: "",
  other_criteria: "",
  transaction_total: null,
  approver_1_email: "",
  approver_1_name: "",
  approver_1_2_operator: "",
  approver_2_email: "",
  approver_2_name: "",
  approver_2_3_operator: "",
  approver_3_email: "",
  approver_3_name: "",
  notes: "",
};

export function createEmptyWorkflowData(customerName: string): WorkflowData {
  return {
    customer_name: customerName,
    gl_system: "",
    fund_codes: "",
    org_codes: "",
    workflow_steps: {},
    additional_notes: "",
  };
}
