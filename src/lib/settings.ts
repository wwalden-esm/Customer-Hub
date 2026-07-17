import fs from "fs";
import path from "path";

interface LinkItem {
  label: string;
  url: string;
  icon?: string;
}

interface Settings {
  globalLinks: LinkItem[];
  allowCustomerRaidSubmissions?: boolean;
}

const settingsPath = path.join(process.cwd(), "config", "settings.json");

export function getSettings(): Settings {
  try {
    const raw = fs.readFileSync(settingsPath, "utf-8");
    return JSON.parse(raw) as Settings;
  } catch {
    return { globalLinks: [] };
  }
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
