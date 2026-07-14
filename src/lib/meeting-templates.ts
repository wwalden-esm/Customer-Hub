import { readFileSync, writeFileSync } from "fs";
import { join } from "path";

export interface MeetingTemplateSection {
  title: string;
  prompt: string;
}

export interface MeetingTemplate {
  id: string;
  name: string;
  duration: number;
  sections: MeetingTemplateSection[];
}

const STORE_PATH = join(process.cwd(), "config", "meeting-templates.json");

export function loadMeetingTemplates(): MeetingTemplate[] {
  try {
    const data = JSON.parse(readFileSync(STORE_PATH, "utf-8"));
    return data.templates || [];
  } catch {
    return [];
  }
}

export function saveMeetingTemplates(templates: MeetingTemplate[]) {
  writeFileSync(STORE_PATH, JSON.stringify({ templates }, null, 2) + "\n", "utf-8");
}

export function getMeetingTemplate(id: string): MeetingTemplate | null {
  return loadMeetingTemplates().find((t) => t.id === id) || null;
}
