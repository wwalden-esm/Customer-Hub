import { readFile } from "fs/promises";
import path from "path";
import { getTemplatesDir } from "@/lib/storage";

const TEMPLATE_FILE = "uat-completion-guide-template.docx";

export async function generateUatCompletionGuide(
  customerName: string,
  scName: string,
  scEmail: string,
): Promise<Buffer> {
  const tplPath = path.join(getTemplatesDir(), TEMPLATE_FILE);
  const templateBuffer = await readFile(tplPath);

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const JSZip = require("jszip");
  const zip = await JSZip.loadAsync(templateBuffer);
  const docXml: string = await zip.file("word/document.xml").async("string");

  const replaced = docXml
    .replace(/\[Institution Name\]/g, customerName)
    .replace(/\[SC Name\]/g, scName)
    .replace(/\[SC Email\]/g, scEmail)
    .replace(/<Customer Name Here>/g, customerName);

  zip.file("word/document.xml", replaced);

  // Also replace in headers if they exist
  const headerFiles = Object.keys(zip.files).filter((f: string) => f.match(/word\/header\d*\.xml/));
  for (const hf of headerFiles) {
    const hxml: string = await zip.file(hf).async("string");
    const hReplaced = hxml
      .replace(/\[Institution Name\]/g, customerName)
      .replace(/\[SC Name\]/g, scName)
      .replace(/\[SC Email\]/g, scEmail)
      .replace(/<Customer Name Here>/g, customerName);
    zip.file(hf, hReplaced);
  }

  // Replace in footers too
  const footerFiles = Object.keys(zip.files).filter((f: string) => f.match(/word\/footer\d*\.xml/));
  for (const ff of footerFiles) {
    const fxml: string = await zip.file(ff).async("string");
    const fReplaced = fxml
      .replace(/\[Institution Name\]/g, customerName)
      .replace(/\[SC Name\]/g, scName)
      .replace(/\[SC Email\]/g, scEmail)
      .replace(/<Customer Name Here>/g, customerName);
    zip.file(ff, fReplaced);
  }

  const output = await zip.generateAsync({ type: "nodebuffer" });
  return Buffer.from(output);
}
