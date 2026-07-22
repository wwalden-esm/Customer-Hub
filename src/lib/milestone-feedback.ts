import { createJsonStore } from "@/lib/data-store";

export interface MilestoneFeedback {
  id: string;
  projectId: string;
  milestoneId: string;
  rating: "positive" | "negative";
  contactName: string;
  contactEmail: string;
  createdAt: string;
}

const store = createJsonStore<MilestoneFeedback[]>("milestone-feedback", []);

function load(): MilestoneFeedback[] {
  return store.load();
}

function save(items: MilestoneFeedback[]) {
  store.save(items);
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
