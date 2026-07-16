import {
  getSheet,
  getFolder,
  columnIdMap,
  cellValue,
  addRows,
  createSheetInFolder,
  ssFetch,
  type SsRow,
  type SsCell,
} from "@/lib/smartsheet";
import { saveSmartsheetConfigField } from "@/lib/smartsheet-data";
import type { WorkflowData, WorkflowStep, WorkflowRule } from "@/lib/documents/workflow-prompts";
import { createEmptyWorkflowData } from "@/lib/documents/workflow-prompts";

const WORKFLOW_SHEET_COLUMNS = [
  { title: "Step Key", type: "TEXT_NUMBER", primary: true },
  { title: "Step Label", type: "TEXT_NUMBER" },
  { title: "Step Priority", type: "TEXT_NUMBER" },
  { title: "Has Threshold", type: "CHECKBOX" },
  { title: "Workflow Name", type: "TEXT_NUMBER" },
  { title: "Fund Code", type: "TEXT_NUMBER" },
  { title: "Org Code", type: "TEXT_NUMBER" },
  { title: "Other Criteria", type: "TEXT_NUMBER" },
  { title: "Transaction Total", type: "TEXT_NUMBER" },
  { title: "Approver 1 Email", type: "TEXT_NUMBER" },
  { title: "Approver 1 Name", type: "TEXT_NUMBER" },
  { title: "Appr 1-2 Operator", type: "TEXT_NUMBER" },
  { title: "Approver 2 Email", type: "TEXT_NUMBER" },
  { title: "Approver 2 Name", type: "TEXT_NUMBER" },
  { title: "Appr 2-3 Operator", type: "TEXT_NUMBER" },
  { title: "Approver 3 Email", type: "TEXT_NUMBER" },
  { title: "Approver 3 Name", type: "TEXT_NUMBER" },
  { title: "Notes", type: "TEXT_NUMBER" },
  { title: "GL System", type: "TEXT_NUMBER" },
  { title: "Fund Codes Desc", type: "TEXT_NUMBER" },
  { title: "Org Codes Desc", type: "TEXT_NUMBER" },
  { title: "Additional Notes", type: "TEXT_NUMBER" },
  { title: "Review Status", type: "TEXT_NUMBER" },
  { title: "Review Notes", type: "TEXT_NUMBER" },
];

export async function ensureWorkflowDataSheet(
  projectId: string,
  customerFolderId: string,
  customerName: string,
): Promise<string> {
  const folder = await getFolder(customerFolderId);
  const existing = folder.sheets?.find((s) =>
    /workflow\s*data/i.test(s.name)
  );
  if (existing) {
    saveSmartsheetConfigField(projectId, "workflowDataSheetId", String(existing.id));
    return String(existing.id);
  }

  const sheet = await createSheetInFolder(customerFolderId, {
    name: `${customerName} - Workflow Data`,
    columns: WORKFLOW_SHEET_COLUMNS,
  });

  saveSmartsheetConfigField(projectId, "workflowDataSheetId", String(sheet.id));
  return String(sheet.id);
}

export async function readWorkflowData(
  sheetId: string,
  customerName: string,
): Promise<WorkflowData> {
  const sheet = await getSheet(sheetId);
  const cols = columnIdMap(sheet);

  if (sheet.rows.length === 0) {
    return createEmptyWorkflowData(customerName);
  }

  const data = createEmptyWorkflowData(customerName);

  const c = (row: SsRow, title: string) => {
    const colId = cols.get(title);
    return colId ? cellValue(row, colId) : null;
  };

  // Read metadata from the first row
  const firstRow = sheet.rows[0];
  data.gl_system = c(firstRow, "GL System") ?? "";
  data.fund_codes = c(firstRow, "Fund Codes Desc") ?? "";
  data.org_codes = c(firstRow, "Org Codes Desc") ?? "";
  data.additional_notes = c(firstRow, "Additional Notes") ?? "";
  data.review_status = (c(firstRow, "Review Status") as WorkflowData["review_status"]) ?? undefined;
  data.review_notes = c(firstRow, "Review Notes") ?? undefined;

  // Group rows by step key
  const stepRows = new Map<string, SsRow[]>();
  for (const row of sheet.rows) {
    const stepKey = c(row, "Step Key");
    if (!stepKey) continue;
    if (!stepRows.has(stepKey)) stepRows.set(stepKey, []);
    stepRows.get(stepKey)!.push(row);
  }

  for (const [stepKey, rows] of Array.from(stepRows.entries())) {
    const firstStepRow = rows[0];
    const step: WorkflowStep = {
      active: true,
      label: c(firstStepRow, "Step Label") ?? stepKey,
      priority: Number(c(firstStepRow, "Step Priority") ?? 100),
      has_threshold: c(firstStepRow, "Has Threshold") === "true" ||
                     c(firstStepRow, "Has Threshold") === "1",
      rules: [],
    };

    for (const row of rows) {
      const workflowName = c(row, "Workflow Name");
      if (!workflowName) continue;

      const rule: WorkflowRule = {
        workflow_name: workflowName,
        fund_code: c(row, "Fund Code") ?? "",
        org_code: c(row, "Org Code") ?? "",
        other_criteria: c(row, "Other Criteria") ?? "",
        transaction_total: c(row, "Transaction Total")
          ? Number(c(row, "Transaction Total"))
          : null,
        approver_1_email: c(row, "Approver 1 Email") ?? "",
        approver_1_name: c(row, "Approver 1 Name") ?? "",
        approver_1_2_operator: c(row, "Appr 1-2 Operator") ?? "",
        approver_2_email: c(row, "Approver 2 Email") ?? "",
        approver_2_name: c(row, "Approver 2 Name") ?? "",
        approver_2_3_operator: c(row, "Appr 2-3 Operator") ?? "",
        approver_3_email: c(row, "Approver 3 Email") ?? "",
        approver_3_name: c(row, "Approver 3 Name") ?? "",
        notes: c(row, "Notes") ?? "",
      };
      step.rules.push(rule);
    }

    data.workflow_steps[stepKey] = step;
  }

  return data;
}

export async function writeWorkflowData(
  sheetId: string,
  data: WorkflowData,
): Promise<void> {
  const sheet = await getSheet(sheetId);
  const cols = columnIdMap(sheet);

  // Delete all existing rows first
  if (sheet.rows.length > 0) {
    const rowIds = sheet.rows.map((r) => r.id);
    const batchSize = 200;
    for (let i = 0; i < rowIds.length; i += batchSize) {
      const batch = rowIds.slice(i, i + batchSize);
      await ssFetch(`/sheets/${sheetId}/rows?ids=${batch.join(",")}`, {
        method: "DELETE",
      });
    }
  }

  // Build new rows — one per rule, with step metadata on each row
  const newRows: { cells: SsCell[] }[] = [];

  const makeCell = (title: string, value: string | number | boolean | null): SsCell | null => {
    const colId = cols.get(title);
    if (!colId) return null;
    return { columnId: colId, value };
  };

  const sortedSteps = Object.entries(data.workflow_steps)
    .filter(([, step]) => step.active)
    .sort(([, a], [, b]) => a.priority - b.priority);

  let isFirstRow = true;

  for (const [stepKey, step] of sortedSteps) {
    const rules = step.rules.length > 0 ? step.rules : [null];

    for (const rule of rules) {
      const cells: SsCell[] = [];
      const push = (title: string, value: string | number | boolean | null) => {
        const cell = makeCell(title, value);
        if (cell) cells.push(cell);
      };

      push("Step Key", stepKey);
      push("Step Label", step.label);
      push("Step Priority", step.priority);
      push("Has Threshold", step.has_threshold);

      if (rule) {
        push("Workflow Name", rule.workflow_name);
        push("Fund Code", rule.fund_code);
        push("Org Code", rule.org_code);
        push("Other Criteria", rule.other_criteria);
        push("Transaction Total", rule.transaction_total);
        push("Approver 1 Email", rule.approver_1_email);
        push("Approver 1 Name", rule.approver_1_name);
        push("Appr 1-2 Operator", rule.approver_1_2_operator);
        push("Approver 2 Email", rule.approver_2_email);
        push("Approver 2 Name", rule.approver_2_name);
        push("Appr 2-3 Operator", rule.approver_2_3_operator);
        push("Approver 3 Email", rule.approver_3_email);
        push("Approver 3 Name", rule.approver_3_name);
        push("Notes", rule.notes);
      }

      if (isFirstRow) {
        push("GL System", data.gl_system);
        push("Fund Codes Desc", data.fund_codes);
        push("Org Codes Desc", data.org_codes);
        push("Additional Notes", data.additional_notes);
        push("Review Status", data.review_status ?? "draft");
        push("Review Notes", data.review_notes ?? "");
        isFirstRow = false;
      }

      newRows.push({ cells });
    }
  }

  if (newRows.length > 0) {
    const batchSize = 200;
    for (let i = 0; i < newRows.length; i += batchSize) {
      await addRows(sheetId, newRows.slice(i, i + batchSize));
    }
  }
}
