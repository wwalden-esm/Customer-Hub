export const WORKFLOW_EXTRACTION_SYSTEM = `You are a data extraction specialist for ESM Solutions, a procurement software company. Your task is to extract structured workflow approval data from customer documents. These documents may include policy manuals, approval matrices, org charts, and procurement guidelines.

RULES:
- Extract ONLY information that is explicitly stated in the documents
- Do NOT fabricate or infer data that is not present
- If information is partially available, include what you have and add "[SAMPLE - verify details]" in the notes field
- Every active step MUST have at least one rule. If a step appears active but has no clear rules, create one rule with "[SAMPLE - verify details]" markers
- Approver email addresses must be exact as found in the document; do not guess email formats
- Threshold amounts should be numeric values only (no currency symbols)
- The "operator" between approvers should be one of: "NEXT" (sequential), "AND" (all must approve), or "OR" (any one approves)`;

export const WORKFLOW_EXTRACTION_USER = `Analyze the following customer documents and extract the procurement workflow approval rules into the JSON structure below.

The ESM workflow template has up to 15 approval steps:
- Step 1: Budget Manager (priority 100) - no dollar threshold
- Step 2: Special Approvals (priority 200) - no dollar threshold
- Step 3: Dean / Director / AVP (priority 300) - has dollar threshold (Transaction Total Min)
- Step 4: Vice President (priority 400) - has dollar threshold
- Step 5: President (priority 500) - has dollar threshold
- Step 6: Purchasing (priority 600) - no dollar threshold
- Steps 7-15: Custom/placeholder steps (priorities 700-1500) - may have dollar threshold

Each rule in a step represents one approval routing. A rule has:
- workflow_name: unique name for this rule (max 50 chars)
- fund_code: Segment 1 value (leave empty if not applicable)
- org_code: Segment 2 / Organization Code value (leave empty if not applicable)
- other_criteria: Account Code, Auxiliary Field, or other trigger criteria
- transaction_total: minimum dollar amount triggering this step (only for threshold steps 3-5 and optionally 7+)
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
      "label": "Budget Manager",
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
    },
    "step2": { "active": false, "label": "Special Approvals", "priority": 200, "has_threshold": false, "rules": [] },
    "step3": { "active": true, "label": "Dean/Director/AVP", "priority": 300, "has_threshold": true, "rules": [] },
    "step4": { "active": true, "label": "Vice President", "priority": 400, "has_threshold": true, "rules": [] },
    "step5": { "active": true, "label": "President", "priority": 500, "has_threshold": true, "rules": [] },
    "step6": { "active": false, "label": "Purchasing", "priority": 600, "has_threshold": false, "rules": [] },
    "step7": { "active": false, "label": "Custom Step 7", "priority": 700, "has_threshold": true, "rules": [] }
  },
  "additional_notes": "string - any other relevant information found in the documents"
}
\`\`\`

Set "active" to false for steps not mentioned or not applicable. Only include steps 7+ if the customer has custom approval levels beyond the standard 6.`;

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
  threshold_amount?: number;
  rules: WorkflowRule[];
}

export interface WorkflowData {
  customer_name: string;
  gl_system: string;
  fund_codes: string;
  org_codes: string;
  workflow_steps: Record<string, WorkflowStep>;
  additional_notes: string;
}
