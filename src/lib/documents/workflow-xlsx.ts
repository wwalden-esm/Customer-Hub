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

  // Step 1: Use JSZip to replace [Customer Name] in shared strings (preserves formatting)
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const JSZip = require("jszip");
  const zip = await JSZip.loadAsync(templateBuffer);

  const ssFile = zip.file("xl/sharedStrings.xml");
  if (ssFile) {
    const ssXml: string = await ssFile.async("string");
    const replaced = ssXml.replace(/\[Customer Name\]/g, workflowData.customer_name);
    zip.file("xl/sharedStrings.xml", replaced);
  }

  // Replace in sheet XML too (inline strings)
  const sheetFiles = Object.keys(zip.files).filter((f: string) =>
    f.match(/xl\/worksheets\/sheet\d+\.xml/)
  );
  for (const sf of sheetFiles) {
    const xml: string = await zip.file(sf).async("string");
    if (xml.includes("[Customer Name]")) {
      zip.file(sf, xml.replace(/\[Customer Name\]/g, workflowData.customer_name));
    }
  }

  // Step 2: Generate the modified XLSX buffer with customer name replaced
  const modifiedBuffer = await zip.generateAsync({ type: "nodebuffer" });

  // Step 3: Now use SheetJS to write data into cells (this re-reads the modified file)
  const workbook = XLSX.read(modifiedBuffer, { type: "buffer" });

  const stepSheetMap = buildStepSheetMap(workbook.SheetNames);

  for (const [sheetName, stepKey] of Object.entries(stepSheetMap)) {
    const step = workflowData.workflow_steps[stepKey];
    if (!step || !step.active || step.rules.length === 0) continue;

    const sheet = workbook.Sheets[sheetName];
    const hasThreshold = isThresholdSheet(stepKey);
    const headerRow = findHeaderRow(sheet);
    const instructionsRow = findInstructionsRow(sheet, headerRow);
    const dataStart = instructionsRow > 0 ? instructionsRow + 1 : headerRow + 1;
    const cols = detectColumns(sheet, headerRow, hasThreshold);

    for (let i = 0; i < step.rules.length; i++) {
      const r = dataStart + i;
      const rule = step.rules[i];

      setCell(sheet, r, 0, i + 1);
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

    // Extend sheet range
    const ref = sheet["!ref"];
    if (ref) {
      const range = XLSX.utils.decode_range(ref);
      const lastRow = dataStart + step.rules.length - 1;
      if (lastRow > range.e.r) range.e.r = lastRow;
      sheet["!ref"] = XLSX.utils.encode_range(range);
    }
  }

  const output = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
  return Buffer.from(output);
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

function isThresholdSheet(stepKey: string): boolean {
  const num = parseInt(stepKey.replace("step", ""));
  return num >= 3 && num !== 6;
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
