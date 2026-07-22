import { createJsonStore } from "@/lib/data-store";

interface LinkItem {
  label: string;
  url: string;
  icon?: string;
}

export interface Settings {
  globalLinks: LinkItem[];
  allowCustomerRaidSubmissions?: boolean;
  defaultAccentColor?: string;
  [key: string]: unknown;
}

const store = createJsonStore<Settings>("settings", { globalLinks: [] } as Settings);

export function getSettings(): Settings {
  return store.load();
}

export function saveSettings(settings: Settings): void {
  store.save(settings);
}

export function getGlobalLinks(): LinkItem[] {
  return getSettings().globalLinks ?? [];
}

export function getAllowCustomerRaidSubmissions(): boolean {
  const settings = getSettings();
  return settings.allowCustomerRaidSubmissions !== false;
}

export function isRaidSubmissionAllowed(projectOverride?: boolean): boolean {
  if (projectOverride === true) return true;
  if (projectOverride === false) return false;
  return getAllowCustomerRaidSubmissions();
}
