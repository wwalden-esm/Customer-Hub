import { readFile } from "fs/promises";
import path from "path";
import * as XLSX from "xlsx";

export async function extractTextFromFile(filePath: string): Promise<string> {
  const ext = path.extname(filePath).toLowerCase();

  switch (ext) {
    case ".txt":
    case ".csv":
      return readFile(filePath, "utf-8");

    case ".pdf":
      return extractPdfText(filePath);

    case ".docx":
      return extractDocxText(filePath);

    case ".xlsx":
    case ".xls":
      return extractXlsxText(filePath);

    default:
      throw new Error(`Unsupported file type: ${ext}`);
  }
}

async function extractPdfText(filePath: string): Promise<string> {
  // pdf-parse has CJS/ESM typing issues, use require
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pdfParse = require("pdf-parse") as (buf: Buffer) => Promise<{ text: string }>;
  const buffer = await readFile(filePath);
  const data = await pdfParse(buffer);
  return data.text;
}

async function extractDocxText(filePath: string): Promise<string> {
  const buffer = await readFile(filePath);

  // Minimal DOCX text extraction via ZIP + XML parsing
  // DOCX is a ZIP containing word/document.xml
  const { Uint8Array: U8 } = globalThis;
  const JSZip = await loadJSZip();
  const zip = await JSZip.loadAsync(new U8(buffer));
  const xmlFile = zip.file("word/document.xml");
  if (!xmlFile) throw new Error("Invalid DOCX: missing word/document.xml");

  const xml = await xmlFile.async("string");
  return xml
    .replace(/<w:tab\/>/g, "\t")
    .replace(/<w:br[^/]*\/>/g, "\n")
    .replace(/<\/w:p>/g, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function loadJSZip(): Promise<any> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require("jszip");
}

function extractXlsxText(filePath: string): string {
  const workbook = XLSX.readFile(filePath);
  const parts: string[] = [];

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const csv = XLSX.utils.sheet_to_csv(sheet);
    if (csv.trim()) {
      parts.push(`--- Sheet: ${sheetName} ---\n${csv}`);
    }
  }

  return parts.join("\n\n");
}

export async function extractTextFromMultipleFiles(filePaths: string[]): Promise<string> {
  const texts: string[] = [];
  for (const fp of filePaths) {
    const text = await extractTextFromFile(fp);
    const name = path.basename(fp);
    texts.push(`=== FILE: ${name} ===\n${text}`);
  }
  return texts.join("\n\n");
}

const ACCEPTED_EXTENSIONS = new Set([".pdf", ".docx", ".xlsx", ".xls", ".txt", ".csv"]);
const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB

export function validateUploadFile(fileName: string, sizeBytes: number): string | null {
  const ext = path.extname(fileName).toLowerCase();
  if (!ACCEPTED_EXTENSIONS.has(ext)) {
    return `Unsupported file type: ${ext}. Accepted: ${Array.from(ACCEPTED_EXTENSIONS).join(", ")}`;
  }
  if (sizeBytes > MAX_FILE_SIZE) {
    return `File too large: ${(sizeBytes / 1024 / 1024).toFixed(1)}MB. Maximum: 25MB`;
  }
  return null;
}
