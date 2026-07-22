import { createJsonStore } from "@/lib/data-store";

export interface PortalVisit {
  projectId: string;
  email: string;
  name: string | null;
  page: string;
  timestamp: string;
}

export interface ProjectActivitySummary {
  projectId: string;
  totalVisits: number;
  uniqueVisitors: number;
  lastVisit: string | null;
  recentVisitors: Array<{ email: string; name: string | null; lastSeen: string; pageViews: number }>;
}

const store = createJsonStore<PortalVisit[]>("portal-activity", []);

function readLog(): PortalVisit[] {
  return store.load();
}

function writeLog(visits: PortalVisit[]) {
  store.save(visits);
}

export function recordVisit(projectId: string, email: string, name: string | null, page: string) {
  const visits = readLog();
  visits.push({
    projectId,
    email,
    name,
    page,
    timestamp: new Date().toISOString(),
  });

  const maxEntries = 10000;
  const trimmed = visits.length > maxEntries ? visits.slice(visits.length - maxEntries) : visits;
  writeLog(trimmed);
}

export function getProjectActivitySummary(projectId: string): ProjectActivitySummary {
  const visits = readLog().filter((v) => v.projectId === projectId);
  const visitorMap = new Map<string, { email: string; name: string | null; lastSeen: string; pageViews: number }>();

  for (const v of visits) {
    const existing = visitorMap.get(v.email);
    if (!existing || v.timestamp > existing.lastSeen) {
      visitorMap.set(v.email, {
        email: v.email,
        name: v.name ?? existing?.name ?? null,
        lastSeen: v.timestamp,
        pageViews: (existing?.pageViews ?? 0) + 1,
      });
    } else {
      existing.pageViews++;
    }
  }

  const recentVisitors = Array.from(visitorMap.values()).sort(
    (a, b) => new Date(b.lastSeen).getTime() - new Date(a.lastSeen).getTime(),
  );

  return {
    projectId,
    totalVisits: visits.length,
    uniqueVisitors: visitorMap.size,
    lastVisit: recentVisitors[0]?.lastSeen ?? null,
    recentVisitors: recentVisitors.slice(0, 10),
  };
}

export function getAllActivitySummaries(): ProjectActivitySummary[] {
  const visits = readLog();
  const projectIds = new Set(visits.map((v) => v.projectId));
  return Array.from(projectIds).map((id) => getProjectActivitySummary(id));
}
