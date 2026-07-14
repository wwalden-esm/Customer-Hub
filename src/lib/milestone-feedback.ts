import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";

export interface MilestoneFeedback {
  id: string;
  projectId: string;
  milestoneId: string;
  rating: "positive" | "negative";
  contactName: string;
  contactEmail: string;
  createdAt: string;
}

const STORE_FILE = join(process.cwd(), "config", "milestone-feedback.json");

function load(): MilestoneFeedback[] {
  if (!existsSync(STORE_FILE)) return [];
  try {
    return JSON.parse(readFileSync(STORE_FILE, "utf-8"));
  } catch {
    return [];
  }
}

function save(items: MilestoneFeedback[]) {
  writeFileSync(STORE_FILE, JSON.stringify(items, null, 2) + "\n", "utf-8");
}

export function addFeedback(
  projectId: string,
  milestoneId: string,
  rating: "positive" | "negative",
  contactName: string,
  contactEmail: string,
): MilestoneFeedback {
  const all = load();
  // Replace existing feedback from same contact on same milestone
  const existing = all.findIndex(
    (f) => f.projectId === projectId && f.milestoneId === milestoneId && f.contactEmail === contactEmail,
  );
  const feedback: MilestoneFeedback = {
    id: `mf-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    projectId,
    milestoneId,
    rating,
    contactName,
    contactEmail,
    createdAt: new Date().toISOString(),
  };
  if (existing >= 0) {
    all[existing] = feedback;
  } else {
    all.push(feedback);
  }
  save(all);
  return feedback;
}

export function getFeedbackForProject(projectId: string): MilestoneFeedback[] {
  return load().filter((f) => f.projectId === projectId);
}

export function getFeedbackForMilestone(projectId: string, milestoneId: string): MilestoneFeedback[] {
  return load().filter((f) => f.projectId === projectId && f.milestoneId === milestoneId);
}
