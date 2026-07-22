import { createJsonStore } from "@/lib/data-store";

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

const store = createJsonStore<{ templates: MeetingTemplate[] }>("meeting-templates", { templates: [] });

export function loadMeetingTemplates(): MeetingTemplate[] {
  return store.load().templates;
}

export function saveMeetingTemplates(templates: MeetingTemplate[]) {
  store.save({ templates });
}

export function getMeetingTemplate(id: string): MeetingTemplate | null {
  return loadMeetingTemplates().find((t) => t.id === id) || null;
}
