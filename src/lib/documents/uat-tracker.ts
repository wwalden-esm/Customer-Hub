import { readFile } from "fs/promises";
import path from "path";
import { getTemplatesDir } from "@/lib/storage";

const TEMPLATE_FILE = "uat-tracker-template.xlsx";

export async function generateUatTracker(customerName: string): Promise<Buffer> {
  const tplPath = path.join(getTemplatesDir(), TEMPLATE_FILE);
  const templateBuffer = await readFile(tplPath);

  // XLSX is a ZIP — modify XML directly to preserve formatting
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const JSZip = require("jszip");
  const zip = await JSZip.loadAsync(templateBuffer);

  // Replace in shared strings (where cell text values live)
  const ssFile = zip.file("xl/sharedStrings.xml");
  if (ssFile) {
    const ssXml: string = await ssFile.async("string");
    const replaced = ssXml.replace(/<Customer Name Here>/g, customerName);
    zip.file("xl/sharedStrings.xml", replaced);
  }

  // Also check individual sheet XML files for inline strings
  const sheetFiles = Object.keys(zip.files).filter((f: string) =>
    f.match(/xl\/worksheets\/sheet\d+\.xml/)
  );
  for (const sf of sheetFiles) {
    const xml: string = await zip.file(sf).async("string");
    if (xml.includes("<Customer Name Here>")) {
      zip.file(sf, xml.replace(/<Customer Name Here>/g, customerName));
    }
  }

  const output = await zip.generateAsync({ type: "nodebuffer" });
  return Buffer.from(output);
}
