import path from "path";

const TEMPLATES_DIR = path.join(process.cwd(), "templates");

export function getTemplatesDir(): string {
  return TEMPLATES_DIR;
}
