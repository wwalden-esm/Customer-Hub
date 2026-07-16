import * as XLSX from "xlsx";
import { WorkflowData } from "./workflow-prompts";
import { readFile } from "fs/promises";
import path from "path";
import { getTemplatesDir } from "@/lib/storage";

const TEMPLATE_FILE = "workflow-data-template.xlsx";

export async function generateWorkflowXlsx(
  workflowData: WorkflowData,
  templatePath?: string,
): Promise<Buffer> {
  const tplPath = templatePath || path.join(getTemplatesDir(), TEMPLATE_FILE);
  const templateBuffer = await readFile(tplPath);

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const JSZip = require("jszip");
  const zip = await JSZip.loadAsync(templateBuffer);

  // Replace [Customer Name] in shared strings
  const ssFile = zip.file("xl/sharedStrings.xml");
  if (ssFile) {
    const ssXml: string = await ssFile.async("string");
    const replaced = ssXml.replace(/\[Customer Name\]/g, workflowData.customer_name);
    zip.file("xl/sharedStrings.xml", replaced);
  }

  // Replace in sheet XML inline strings
  const sheetFiles = Object.keys(zip.files).filter((f: string) =>
    f.match(/xl\/worksheets\/sheet\d+\.xml/)
  );
  for (const sf of sheetFiles) {
    const xml: string = await zip.file(sf).async("string");
    if (xml.includes("[Customer Name]")) {
      zip.file(sf, xml.replace(/\[Customer Name\]/g, workflowData.customer_name));
    }
  }

  const modifiedBuffer = await zip.generateAsync({ type: "nodebuffer" });

  const workbook = XLSX.read(modifiedBuffer, { type: "buffer" });

  // Build map of template step sheets (sheet index -> sheet name)
  const templateSteps = buildStepSheetMap(workbook.SheetNames);

  // Get active steps sorted by priority
  const activeSteps = Object.entries(workflowData.workflow_steps)
    .filter(([, step]) => step.active && step.rules.length > 0)
    .sort(([, a], [, b]) => a.priority - b.priority);

  // Map customer steps to template sheets in order
  const templateSheetNames = Object.keys(templateSteps);

  for (let i = 0; i < activeSteps.length && i < templateSheetNames.length; i++) {
    const sheetName = templateSheetNames[i];
    const [, step] = activeSteps[i];

    const sheet = workbook.Sheets[sheetName];
    if (!sheet) continue;

    const hasThreshold = step.has_threshold;
    const headerRow = findHeaderRow(sheet);
    const instructionsRow = findInstructionsRow(sheet, headerRow);
    const dataStart = instructionsRow > 0 ? instructionsRow + 1 : headerRow + 1;
    const cols = detectColumns(sheet, headerRow, hasThreshold);

    // Rename the sheet tab to match the customer's step label
    renameSheet(workbook, sheetName, step, i + 1);

    for (let j = 0; j < step.rules.length; j++) {
      const r = dataStart + j;
      const rule = step.rules[j];

      setCell(sheet, r, 0, j + 1);
      setCell(sheet, r, cols.workflowName, rule.workflow_name || "");
      setCell(sheet, r, cols.fundCode, rule.fund_code || "");
      setCell(sheet, r, cols.orgCode, rule.org_code || "");
      if (cols.otherCriteria >= 0) setCell(sheet, r, cols.otherCriteria, rule.other_criteria || "");
      if (hasThreshold && cols.transactionTotal >= 0 && rule.transaction_total != null) {
        setCell(sheet, r, cols.transactionTotal, rule.transaction_total);
      }
      if (cols.priority >= 0) setCell(sheet, r, cols.priority, step.priority || 100);
      if (cols.operator >= 0) setCell(sheet, r, cols.operator, "AND");
      if (cols.appr1Email >= 0) setCell(sheet, r, cols.appr1Email, rule.approver_1_email || "");
      if (cols.appr1Name >= 0) setCell(sheet, r, cols.appr1Name, rule.approver_1_name || "");
      if (cols.appr12Operator >= 0) setCell(sheet, r, cols.appr12Operator, rule.approver_1_2_operator || "");
      if (cols.appr2Email >= 0) setCell(sheet, r, cols.appr2Email, rule.approver_2_email || "");
      if (cols.appr2Name >= 0) setCell(sheet, r, cols.appr2Name, rule.approver_2_name || "");
      if (cols.appr23Operator >= 0) setCell(sheet, r, cols.appr23Operator, rule.approver_2_3_operator || "");
      if (cols.appr3Email >= 0) setCell(sheet, r, cols.appr3Email, rule.approver_3_email || "");
      if (cols.appr3Name >= 0) setCell(sheet, r, cols.appr3Name, rule.approver_3_name || "");
      if (cols.notes >= 0) setCell(sheet, r, cols.notes, rule.notes || "");
    }

    const ref = sheet["!ref"];
    if (ref) {
      const range = XLSX.utils.decode_range(ref);
      const lastRow = dataStart + step.rules.length - 1;
      if (lastRow > range.e.r) range.e.r = lastRow;
      sheet["!ref"] = XLSX.utils.encode_range(range);
    }
  }

  // --- ESM Import consolidation sheet ---
  const ESM_IMPORT_HEADERS = [
    "Step #", "Step Label", "Workflow Name", "Fund Code", "Org Code",
    "Other Criteria", "Transaction Total", "Priority",
    "Approver 1 Name", "Approver 1 Email", "Op 1-2",
    "Approver 2 Name", "Approver 2 Email", "Op 2-3",
    "Approver 3 Name", "Approver 3 Email", "Notes",
  ];

  const importSheet: XLSX.WorkSheet = {};
  const importRows: (string | number | null)[][] = [];

  // Collect all rules from all active steps, sorted by step priority then rule order
  let stepNum = 0;
  for (const [, step] of activeSteps) {
    stepNum++;
    for (const rule of step.rules) {
      importRows.push([
        stepNum,
        step.label,
        rule.workflow_name || "",
        rule.fund_code || "",
        rule.org_code || "",
        rule.other_criteria || "",
        rule.transaction_total,
        step.priority,
        rule.approver_1_name || "",
        rule.approver_1_email || "",
        rule.approver_1_2_operator || "",
        rule.approver_2_name || "",
        rule.approver_2_email || "",
        rule.approver_2_3_operator || "",
        rule.approver_3_name || "",
        rule.approver_3_email || "",
        rule.notes || "",
      ]);
    }
  }

  // Write header row with bold formatting
  for (let c = 0; c < ESM_IMPORT_HEADERS.length; c++) {
    const addr = XLSX.utils.encode_cell({ r: 0, c });
    importSheet[addr] = { v: ESM_IMPORT_HEADERS[c], t: "s", s: { font: { bold: true } } };
  }

  // Write data rows
  for (let r = 0; r < importRows.length; r++) {
    const row = importRows[r];
    for (let c = 0; c < row.length; c++) {
      const val = row[c];
      if (val == null) continue;
      const addr = XLSX.utils.encode_cell({ r: r + 1, c });
      importSheet[addr] = {
        v: val,
        t: typeof val === "number" ? "n" : "s",
      };
    }
  }

  // Set the sheet range
  importSheet["!ref"] = XLSX.utils.encode_range({
    s: { r: 0, c: 0 },
    e: { r: importRows.length, c: ESM_IMPORT_HEADERS.length - 1 },
  });

  // Set column widths for readability
  importSheet["!cols"] = ESM_IMPORT_HEADERS.map((h) => ({
    wch: Math.max(h.length + 2, 14),
  }));

  // Remove existing ESM Import sheet if present, then add
  const existingImportIdx = workbook.SheetNames.findIndex(
    (n) => n.toLowerCase() === "esm import",
  );
  if (existingImportIdx >= 0) {
    const oldName = workbook.SheetNames[existingImportIdx];
    workbook.SheetNames.splice(existingImportIdx, 1);
    delete workbook.Sheets[oldName];
  }
  workbook.SheetNames.push("ESM Import");
  workbook.Sheets["ESM Import"] = importSheet;

  const output = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
  return Buffer.from(output);
}

function renameSheet(
  workbook: XLSX.WorkBook,
  oldName: string,
  step: { label: string; priority: number },
  stepNumber: number,
): void {
  const newName = `Step ${stepNumber} - ${step.label}`.slice(0, 31);
  if (newName === oldName) return;

  const idx = workbook.SheetNames.indexOf(oldName);
  if (idx === -1) return;

  workbook.SheetNames[idx] = newName;
  workbook.Sheets[newName] = workbook.Sheets[oldName];
  delete workbook.Sheets[oldName];
}

function setCell(sheet: XLSX.WorkSheet, r: number, c: number, v: string | number) {
  if (c < 0) return;
  sheet[XLSX.utils.encode_cell({ r, c })] = { v, t: typeof v === "number" ? "n" : "s" };
}

function buildStepSheetMap(sheetNames: string[]): Record<string, string> {
  const map: Record<string, string> = {};
  for (const name of sheetNames) {
    const match = name.match(/step\s*(\d+)/i);
    if (match) {
      map[name] = `step${match[1]}`;
    }
  }
  return map;
}

function findHeaderRow(sheet: XLSX.WorkSheet): number {
  const range = XLSX.utils.decode_range(sheet["!ref"] || "A1:A1");
  for (let r = range.s.r; r <= Math.min(range.s.r + 5, range.e.r); r++) {
    for (let c = range.s.c; c <= range.e.c; c++) {
      const cell = sheet[XLSX.utils.encode_cell({ r, c })];
      if (cell && String(cell.v || "").toLowerCase().includes("workflow name")) return r;
    }
  }
  return 2;
}

function findInstructionsRow(sheet: XLSX.WorkSheet, headerRow: number): number {
  const next = headerRow + 1;
  const cell = sheet[XLSX.utils.encode_cell({ r: next, c: 0 })];
  if (cell && String(cell.v || "").toLowerCase().includes("instructions")) return next;
  return -1;
}

interface ColLayout {
  workflowName: number;
  fundCode: number;
  orgCode: number;
  otherCriteria: number;
  transactionTotal: number;
  priority: number;
  operator: number;
  appr1Email: number;
  appr1Name: number;
  appr12Operator: number;
  appr2Email: number;
  appr2Name: number;
  appr23Operator: number;
  appr3Email: number;
  appr3Name: number;
  notes: number;
}

function detectColumns(sheet: XLSX.WorkSheet, headerRow: number, hasThreshold: boolean): ColLayout {
  const range = XLSX.utils.decode_range(sheet["!ref"] || "A1:P1");
  const layout: ColLayout = {
    workflowName: 1, fundCode: 2, orgCode: 3, otherCriteria: 4,
    transactionTotal: -1, priority: -1, operator: -1,
    appr1Email: -1, appr1Name: -1, appr12Operator: -1,
    appr2Email: -1, appr2Name: -1, appr23Operator: -1,
    appr3Email: -1, appr3Name: -1, notes: -1,
  };

  for (let c = range.s.c; c <= range.e.c; c++) {
    const cell = sheet[XLSX.utils.encode_cell({ r: headerRow, c })];
    if (!cell) continue;
    const val = String(cell.v || "").toLowerCase().trim();

    if (val.includes("workflow") && val.includes("name")) layout.workflowName = c;
    else if (val.includes("fund") && val.includes("code")) layout.fundCode = c;
    else if ((val.includes("org") && val.includes("code")) || val.includes("organization")) layout.orgCode = c;
    else if (val.includes("other") || (val.includes("criteria") && !val.includes("fund") && !val.includes("org"))) layout.otherCriteria = c;
    else if (val.includes("transaction") || (val.includes("total") && val.includes("min"))) layout.transactionTotal = c;
    else if (val.includes("priority")) layout.priority = c;
    else if (val === "operator" || (val.includes("operator") && !val.includes("appr") && !val.includes("1") && !val.includes("2"))) layout.operator = c;
    else if (val.includes("approver 1 email")) layout.appr1Email = c;
    else if (val.includes("approver 1 name") || (val.includes("appr") && val.includes("1") && val.includes("name"))) layout.appr1Name = c;
    else if (val.includes("appr 1-2") || val.includes("appr1-2")) layout.appr12Operator = c;
    else if (val.includes("approver 2 email")) layout.appr2Email = c;
    else if (val.includes("approver 2 name") || (val.includes("appr") && val.includes("2") && val.includes("name"))) layout.appr2Name = c;
    else if (val.includes("appr 2-3") || val.includes("appr2-3")) layout.appr23Operator = c;
    else if (val.includes("approver 3 email")) layout.appr3Email = c;
    else if (val.includes("approver 3 name") || (val.includes("appr") && val.includes("3") && val.includes("name"))) layout.appr3Name = c;
    else if (val.includes("notes") || val.includes("note")) layout.notes = c;
  }

  if (hasThreshold && layout.transactionTotal < 0) {
    layout.transactionTotal = layout.otherCriteria + 1;
  }

  return layout;
}
