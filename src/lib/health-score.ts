import type { Project, Milestone, ActionItem, RaidLogItem, Meeting, DocumentInfo } from "@/types/models";
import type { SmartsheetConfig } from "@/types/models";
import { parseLocalDate } from "@/lib/date-utils";

export interface HealthScore {
  overall: number;
  grade: "A" | "B" | "C" | "D" | "F";
  riskLevel: "low" | "moderate" | "high" | "critical";
  components: {
    milestoneHealth: number;
    actionItemHealth: number;
    raidHealth: number;
    timelinePressure: number;
    completionProgress: number;
    engagementScore: number;
  };
  signals: HealthSignal[];
  prediction: RiskPrediction;
  dataCoverage: DataCoverage;
}

export interface HealthSignal {
  type: "positive" | "warning" | "critical";
  label: string;
}

export interface RiskPrediction {
  slipProbability: number;
  primaryRisk: string;
  trend: "improving" | "stable" | "declining";
}

export interface DataCoverage {
  configured: string[];
  missing: string[];
  score: number;
}

export interface ProjectAnalytics {
  project: Project;
  healthScore: HealthScore;
  milestoneStats: {
    total: number;
    completed: number;
    inProgress: number;
    overdue: number;
    completionRate: number;
  };
  actionItemStats: {
    total: number;
    completed: number;
    overdue: number;
    highPriority: number;
    overdueRate: number;
  };
  raidStats: {
    total: number;
    openRisks: number;
    openIssues: number;
    blockedItems: number;
    highPriorityOpen: number;
  };
  timelineStats: {
    daysToGoLive: number | null;
    daysElapsed: number | null;
    totalDuration: number | null;
    percentElapsed: number | null;
    progressGap: number | null;
  };
  engagementStats: {
    meetingsCompleted: number;
    meetingsTotal: number;
    recapsSent: number;
    documentsGenerated: number;
  };
}

export interface PortfolioAnalytics {
  projects: ProjectAnalytics[];
  summary: {
    totalProjects: number;
    healthDistribution: { low: number; moderate: number; high: number; critical: number };
    avgHealthScore: number;
    atRiskCount: number;
    onTrackCount: number;
    topRisks: Array<{ projectName: string; risk: string; score: number }>;
  };
  scWorkload: Array<{
    name: string;
    email: string;
    projectCount: number;
    avgHealth: number;
    criticalCount: number;
  }>;
}

export interface HealthSnapshot {
  date: string;
  projects: Record<string, {
    overall: number;
    components: HealthScore["components"];
    riskLevel: HealthScore["riskLevel"];
  }>;
}

const WEIGHTS = {
  milestoneHealth: 0.25,
  actionItemHealth: 0.20,
  raidHealth: 0.15,
  timelinePressure: 0.15,
  completionProgress: 0.15,
  engagementScore: 0.10,
};

function scoreMilestoneHealth(milestones: Milestone[]): { score: number; stats: ProjectAnalytics["milestoneStats"] } {
  const level2 = milestones.filter(m => m.level === 2 || m.isMilestone);
  const total = level2.length;
  if (total === 0) return { score: -1, stats: { total: 0, completed: 0, inProgress: 0, overdue: 0, completionRate: 0 } };

  const completed = level2.filter(m => m.status === "complete").length;
  const inProgress = level2.filter(m => m.status === "in-progress").length;

  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const overdue = level2.filter(m => {
    if (m.status === "complete") return false;
    const endDate = m.endDate || m.date;
    if (!endDate) return false;
    return parseLocalDate(endDate) < now;
  }).length;

  const completionRate = completed / total;
  const overdueRatio = overdue / total;
  const healthCount = level2.filter(m => m.health === "Green").length;
  const yellowCount = level2.filter(m => m.health === "Yellow").length;
  const redCount = level2.filter(m => m.health === "Red").length;
  const healthyWithData = level2.filter(m => m.health).length;

  let score = 50 + (completionRate * 30);
  score -= overdueRatio * 40;
  if (healthyWithData > 0) {
    const healthRatio = (healthCount - redCount * 2 - yellowCount * 0.5) / healthyWithData;
    score += healthRatio * 20;
  }

  return {
    score: Math.max(0, Math.min(100, Math.round(score))),
    stats: { total, completed, inProgress, overdue, completionRate: Math.round(completionRate * 100) },
  };
}

function scoreActionItemHealth(items: ActionItem[]): { score: number; stats: ProjectAnalytics["actionItemStats"] } {
  const total = items.length;
  if (total === 0) return { score: -1, stats: { total: 0, completed: 0, overdue: 0, highPriority: 0, overdueRate: 0 } };

  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const completed = items.filter(i => {
    const s = i.status.toLowerCase();
    return s === "complete" || s === "completed" || s === "done";
  }).length;

  const open = items.filter(i => {
    const s = i.status.toLowerCase();
    return s !== "complete" && s !== "completed" && s !== "done";
  });

  const overdue = open.filter(i => {
    if (!i.dueDate) return false;
    return parseLocalDate(i.dueDate) < now;
  }).length;

  const highPriority = open.filter(i => i.priority.toLowerCase() === "high").length;
  const overdueRate = open.length > 0 ? overdue / open.length : 0;
  const completionRate = completed / total;

  let score = 40 + (completionRate * 35);
  score -= overdueRate * 35;
  score -= (highPriority / Math.max(open.length, 1)) * 10;

  return {
    score: Math.max(0, Math.min(100, Math.round(score))),
    stats: { total, completed, overdue, highPriority, overdueRate: Math.round(overdueRate * 100) },
  };
}

function scoreRaidHealth(items: RaidLogItem[]): { score: number; stats: ProjectAnalytics["raidStats"] } {
  if (items.length === 0) return { score: -1, stats: { total: 0, openRisks: 0, openIssues: 0, blockedItems: 0, highPriorityOpen: 0 } };

  const openItems = items.filter(i => i.status !== "Complete");
  const openRisks = openItems.filter(i => i.type === "Risk").length;
  const openIssues = openItems.filter(i => i.type === "Issue").length;
  const blockedItems = openItems.filter(i => i.status === "Blocked").length;
  const highPriorityOpen = openItems.filter(i => i.priority === "High").length;

  const totalItems = items.length;
  const completedItems = items.filter(i => i.status === "Complete").length;
  const completionRatio = completedItems / totalItems;

  const openRatio = openItems.length / totalItems;
  const blockedRatio = totalItems > 0 ? blockedItems / totalItems : 0;
  const highPriorityRatio = openItems.length > 0 ? highPriorityOpen / openItems.length : 0;

  let score = 50 + (completionRatio * 30);
  score -= openRatio * 15;
  score -= blockedRatio * 25;
  score -= highPriorityRatio * 15;
  if (openRisks > 0) score -= Math.min(10, (openRisks / totalItems) * 20);

  return {
    score: Math.max(0, Math.min(100, Math.round(score))),
    stats: { total: totalItems, openRisks, openIssues, blockedItems, highPriorityOpen },
  };
}

function scoreTimelinePressure(project: Project, milestones: Milestone[]): { score: number; stats: ProjectAnalytics["timelineStats"] } {
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  if (!project.goLiveDate) {
    return { score: -1, stats: { daysToGoLive: null, daysElapsed: null, totalDuration: null, percentElapsed: null, progressGap: null } };
  }

  const goLive = parseLocalDate(project.goLiveDate);
  const daysToGoLive = Math.ceil((goLive.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  let daysElapsed: number | null = null;
  let totalDuration: number | null = null;
  let percentElapsed: number | null = null;
  let progressGap: number | null = null;

  if (project.startDate) {
    const start = parseLocalDate(project.startDate);
    daysElapsed = Math.ceil((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    totalDuration = Math.ceil((goLive.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    percentElapsed = totalDuration > 0 ? Math.round((daysElapsed / totalDuration) * 100) : null;
  }

  // Progress gap: expected completion % (based on elapsed time) vs actual completion %
  const level2 = milestones.filter(m => m.level === 2 || m.isMilestone);
  const actualCompletion = level2.length > 0
    ? level2.filter(m => m.status === "complete").length / level2.length
    : 0;

  if (percentElapsed !== null && level2.length > 0) {
    const expectedCompletion = Math.min(percentElapsed / 100, 1);
    progressGap = Math.round((actualCompletion - expectedCompletion) * 100);
  }

  // Base score from days remaining
  let score: number;
  if (daysToGoLive < 0) score = 15;
  else if (daysToGoLive <= 7) score = 30;
  else if (daysToGoLive <= 14) score = 45;
  else if (daysToGoLive <= 30) score = 60;
  else if (daysToGoLive <= 60) score = 75;
  else if (daysToGoLive <= 90) score = 85;
  else score = 95;

  // Adjust based on progress gap
  if (progressGap !== null) {
    if (progressGap < -30) score -= 20;
    else if (progressGap < -15) score -= 10;
    else if (progressGap > 15) score += 5;
  }

  return {
    score: Math.max(0, Math.min(100, score)),
    stats: { daysToGoLive, daysElapsed, totalDuration, percentElapsed, progressGap },
  };
}

function scoreCompletionProgress(milestones: Milestone[], actionItems: ActionItem[]): number {
  const completedMilestones = milestones.filter(m => m.status === "complete").length;
  const totalMilestones = milestones.filter(m => m.level === 2 || m.isMilestone).length;

  const completedActions = actionItems.filter(i => {
    const s = i.status.toLowerCase();
    return s === "complete" || s === "completed" || s === "done";
  }).length;
  const totalActions = actionItems.length;

  if (totalMilestones === 0 && totalActions === 0) return -1;

  const milestoneProgress = totalMilestones > 0 ? completedMilestones / totalMilestones : 0.5;
  const actionProgress = totalActions > 0 ? completedActions / totalActions : 0.5;

  const progress = (milestoneProgress * 0.6 + actionProgress * 0.4);
  return Math.max(0, Math.min(100, Math.round(progress * 100)));
}

function scoreEngagement(meetings: Meeting[], documents: DocumentInfo[]): { score: number; stats: ProjectAnalytics["engagementStats"] } {
  const meetingsCompleted = meetings.filter(m => m.status === "Complete").length;
  const meetingsTotal = meetings.filter(m => m.status !== "Skipped").length;
  const recapsSent = meetings.filter(m => m.recapSent).length;
  const documentsGenerated = documents.length;

  if (meetingsTotal === 0 && documentsGenerated === 0) {
    return { score: -1, stats: { meetingsCompleted, meetingsTotal, recapsSent, documentsGenerated } };
  }

  let score = 50;

  if (meetingsTotal > 0) {
    const meetingRate = meetingsCompleted / meetingsTotal;
    score += meetingRate * 25;
    const recapRate = meetingsCompleted > 0 ? recapsSent / meetingsCompleted : 0;
    score += recapRate * 15;
  }

  if (documentsGenerated > 0) {
    score += Math.min(10, documentsGenerated * 2);
  }

  return {
    score: Math.max(0, Math.min(100, Math.round(score))),
    stats: { meetingsCompleted, meetingsTotal, recapsSent, documentsGenerated },
  };
}

function computeDataCoverage(config: SmartsheetConfig): DataCoverage {
  const sources = [
    { key: "projectPlanSheetId", label: "Project Plan" },
    { key: "actionItemSheetId", label: "Action Items" },
    { key: "raidLogSheetId", label: "RAID Log" },
    { key: "meetingTrackerSheetId", label: "Meetings" },
    { key: "documentSheetId", label: "Documents" },
    { key: "metricsSheetId", label: "Metrics" },
  ] as const;

  const configured: string[] = [];
  const missing: string[] = [];

  for (const { key, label } of sources) {
    if (config[key]) configured.push(label);
    else missing.push(label);
  }

  const score = Math.round((configured.length / sources.length) * 100);
  return { configured, missing, score };
}

function generateSignals(
  milestoneStats: ProjectAnalytics["milestoneStats"],
  actionItemStats: ProjectAnalytics["actionItemStats"],
  raidStats: ProjectAnalytics["raidStats"],
  timelineStats: ProjectAnalytics["timelineStats"],
  engagementStats: ProjectAnalytics["engagementStats"],
  dataCoverage: DataCoverage,
): HealthSignal[] {
  const signals: HealthSignal[] = [];

  if (milestoneStats.completionRate >= 80) signals.push({ type: "positive", label: `${milestoneStats.completionRate}% milestones complete` });
  if (milestoneStats.overdue > 0) signals.push({ type: milestoneStats.overdue >= 3 ? "critical" : "warning", label: `${milestoneStats.overdue} overdue milestone${milestoneStats.overdue === 1 ? "" : "s"}` });
  if (actionItemStats.overdue > 3) signals.push({ type: "critical", label: `${actionItemStats.overdue} overdue action items` });
  else if (actionItemStats.overdue > 0) signals.push({ type: "warning", label: `${actionItemStats.overdue} overdue action item${actionItemStats.overdue === 1 ? "" : "s"}` });
  if (actionItemStats.overdueRate === 0 && actionItemStats.total > 0) signals.push({ type: "positive", label: "No overdue action items" });
  if (raidStats.blockedItems > 0) signals.push({ type: "critical", label: `${raidStats.blockedItems} blocked RAID item${raidStats.blockedItems === 1 ? "" : "s"}` });
  if (raidStats.openRisks >= 3) signals.push({ type: "warning", label: `${raidStats.openRisks} open risks` });
  if (raidStats.highPriorityOpen > 0) signals.push({ type: "warning", label: `${raidStats.highPriorityOpen} high-priority open item${raidStats.highPriorityOpen === 1 ? "" : "s"}` });
  if (timelineStats.daysToGoLive !== null && timelineStats.daysToGoLive < 0) signals.push({ type: "critical", label: `Go-live was ${Math.abs(timelineStats.daysToGoLive)} days ago` });
  else if (timelineStats.daysToGoLive !== null && timelineStats.daysToGoLive <= 14) signals.push({ type: "warning", label: `${timelineStats.daysToGoLive} days to go-live` });
  if (timelineStats.progressGap !== null && timelineStats.progressGap < -20) signals.push({ type: "critical", label: `${Math.abs(timelineStats.progressGap)}% behind expected progress` });
  else if (timelineStats.progressGap !== null && timelineStats.progressGap > 10) signals.push({ type: "positive", label: `${timelineStats.progressGap}% ahead of expected progress` });
  if (engagementStats.meetingsTotal > 3 && engagementStats.meetingsCompleted / engagementStats.meetingsTotal >= 0.9) signals.push({ type: "positive", label: "Strong meeting engagement" });
  if (actionItemStats.highPriority === 0 && raidStats.blockedItems === 0 && milestoneStats.overdue === 0) signals.push({ type: "positive", label: "No critical blockers" });
  if (dataCoverage.score < 50) signals.push({ type: "warning", label: `Limited data: ${dataCoverage.missing.slice(0, 2).join(", ")} not configured` });

  return signals;
}

function computeGrade(score: number): HealthScore["grade"] {
  if (score >= 90) return "A";
  if (score >= 75) return "B";
  if (score >= 60) return "C";
  if (score >= 40) return "D";
  return "F";
}

function computeRiskLevel(score: number): HealthScore["riskLevel"] {
  if (score >= 80) return "low";
  if (score >= 60) return "moderate";
  if (score >= 40) return "high";
  return "critical";
}

function computePrediction(
  components: HealthScore["components"],
  signals: HealthSignal[],
  history: Array<{ overall: number }>,
): RiskPrediction {
  const criticalCount = signals.filter(s => s.type === "critical").length;
  const positiveCount = signals.filter(s => s.type === "positive").length;

  let slipProbability = 0;
  if (components.milestoneHealth < 50) slipProbability += 25;
  if (components.actionItemHealth < 50) slipProbability += 20;
  if (components.timelinePressure < 40) slipProbability += 20;
  if (components.raidHealth < 50) slipProbability += 15;
  slipProbability += criticalCount * 8;
  slipProbability -= positiveCount * 5;
  slipProbability = Math.max(0, Math.min(95, slipProbability));

  let primaryRisk = "On track";
  if (components.milestoneHealth < 50) primaryRisk = "Milestone delays";
  else if (components.actionItemHealth < 50) primaryRisk = "Action item backlog";
  else if (components.raidHealth < 50) primaryRisk = "Unresolved blockers";
  else if (components.timelinePressure < 40) primaryRisk = "Timeline pressure";
  else if (components.engagementScore < 40) primaryRisk = "Low engagement";

  // Compute trend from historical data if available
  let trend: RiskPrediction["trend"] = "stable";
  if (history.length >= 2) {
    const recent = history.slice(-3);
    const first = recent[0].overall;
    const last = recent[recent.length - 1].overall;
    const diff = last - first;
    if (diff >= 5) trend = "improving";
    else if (diff <= -5) trend = "declining";
  } else {
    if (criticalCount >= 2) trend = "declining";
    else if (positiveCount >= 2 && criticalCount === 0) trend = "improving";
  }

  return { slipProbability, primaryRisk, trend };
}

export function computeHealthScore(
  project: Project,
  milestones: Milestone[],
  actionItems: ActionItem[],
  raidItems: RaidLogItem[],
  meetings: Meeting[],
  documents: DocumentInfo[],
  config: SmartsheetConfig,
  history: Array<{ overall: number }>,
): ProjectAnalytics {
  const { score: milestoneScore, stats: milestoneStats } = scoreMilestoneHealth(milestones);
  const { score: actionItemScore, stats: actionItemStats } = scoreActionItemHealth(actionItems);
  const { score: raidScore, stats: raidStats } = scoreRaidHealth(raidItems);
  const { score: timelineScore, stats: timelineStats } = scoreTimelinePressure(project, milestones);
  const completionScore = scoreCompletionProgress(milestones, actionItems);
  const { score: engagementScore, stats: engagementStats } = scoreEngagement(meetings, documents);
  const dataCoverage = computeDataCoverage(config);

  // For components with no data (-1), use a neutral score but don't count them
  const rawComponents = {
    milestoneHealth: milestoneScore,
    actionItemHealth: actionItemScore,
    raidHealth: raidScore,
    timelinePressure: timelineScore,
    completionProgress: completionScore,
    engagementScore: engagementScore,
  };

  // Reweight: redistribute weight from missing components proportionally
  let totalWeight = 0;
  const activeWeights: Record<string, number> = {};
  for (const [key, weight] of Object.entries(WEIGHTS)) {
    const val = rawComponents[key as keyof typeof rawComponents];
    if (val >= 0) {
      activeWeights[key] = weight;
      totalWeight += weight;
    }
  }

  const components: HealthScore["components"] = {
    milestoneHealth: Math.max(0, milestoneScore),
    actionItemHealth: Math.max(0, actionItemScore),
    raidHealth: Math.max(0, raidScore),
    timelinePressure: Math.max(0, timelineScore),
    completionProgress: Math.max(0, completionScore),
    engagementScore: Math.max(0, engagementScore),
  };

  let overall: number;
  if (totalWeight === 0) {
    overall = 50;
  } else {
    const normalizer = 1 / totalWeight;
    overall = Math.round(
      Object.entries(activeWeights).reduce((sum, [key, weight]) => {
        return sum + components[key as keyof typeof components] * weight * normalizer;
      }, 0)
    );
  }

  const signals = generateSignals(milestoneStats, actionItemStats, raidStats, timelineStats, engagementStats, dataCoverage);

  return {
    project,
    healthScore: {
      overall,
      grade: computeGrade(overall),
      riskLevel: computeRiskLevel(overall),
      components,
      signals,
      prediction: computePrediction(components, signals, history),
      dataCoverage,
    },
    milestoneStats,
    actionItemStats,
    raidStats,
    timelineStats,
    engagementStats,
  };
}

export function computePortfolioAnalytics(projectAnalytics: ProjectAnalytics[]): PortfolioAnalytics {
  const healthDistribution = { low: 0, moderate: 0, high: 0, critical: 0 };
  for (const pa of projectAnalytics) {
    healthDistribution[pa.healthScore.riskLevel]++;
  }

  const avgHealthScore = projectAnalytics.length > 0
    ? Math.round(projectAnalytics.reduce((sum, pa) => sum + pa.healthScore.overall, 0) / projectAnalytics.length)
    : 0;

  const topRisks = projectAnalytics
    .filter(pa => pa.healthScore.riskLevel !== "low")
    .sort((a, b) => a.healthScore.overall - b.healthScore.overall)
    .slice(0, 5)
    .map(pa => ({
      projectName: pa.project.customerName,
      risk: pa.healthScore.prediction.primaryRisk,
      score: pa.healthScore.overall,
    }));

  const scMap = new Map<string, { name: string; email: string; scores: number[]; criticals: number }>();
  for (const pa of projectAnalytics) {
    const key = pa.project.scEmail || "unassigned";
    const existing = scMap.get(key) || { name: pa.project.scName, email: key, scores: [], criticals: 0 };
    existing.scores.push(pa.healthScore.overall);
    if (pa.healthScore.riskLevel === "critical") existing.criticals++;
    scMap.set(key, existing);
  }

  const scWorkload = Array.from(scMap.values()).map(sc => ({
    name: sc.name,
    email: sc.email,
    projectCount: sc.scores.length,
    avgHealth: Math.round(sc.scores.reduce((a, b) => a + b, 0) / sc.scores.length),
    criticalCount: sc.criticals,
  })).sort((a, b) => a.avgHealth - b.avgHealth);

  return {
    projects: projectAnalytics,
    summary: {
      totalProjects: projectAnalytics.length,
      healthDistribution,
      avgHealthScore,
      atRiskCount: healthDistribution.high + healthDistribution.critical,
      onTrackCount: healthDistribution.low,
      topRisks,
    },
    scWorkload,
  };
}

// --- Historical snapshot management ---

import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";

const HISTORY_FILE = join(process.cwd(), "config", "health-history.json");

export function loadHealthHistory(): HealthSnapshot[] {
  if (!existsSync(HISTORY_FILE)) return [];
  try {
    return JSON.parse(readFileSync(HISTORY_FILE, "utf-8"));
  } catch {
    return [];
  }
}

export function saveHealthSnapshot(analytics: ProjectAnalytics[]): void {
  const history = loadHealthHistory();
  const today = new Date().toISOString().split("T")[0];

  // Don't save more than once per day
  if (history.length > 0 && history[history.length - 1].date === today) {
    history[history.length - 1] = buildSnapshot(today, analytics);
  } else {
    history.push(buildSnapshot(today, analytics));
  }

  // Keep last 52 weeks
  const trimmed = history.slice(-52);
  writeFileSync(HISTORY_FILE, JSON.stringify(trimmed, null, 2) + "\n", "utf-8");
}

function buildSnapshot(date: string, analytics: ProjectAnalytics[]): HealthSnapshot {
  const projects: HealthSnapshot["projects"] = {};
  for (const pa of analytics) {
    projects[pa.project.id] = {
      overall: pa.healthScore.overall,
      components: pa.healthScore.components,
      riskLevel: pa.healthScore.riskLevel,
    };
  }
  return { date, projects };
}

export function getProjectHistory(projectId: string, snapshots: HealthSnapshot[]): Array<{ date: string; overall: number }> {
  return snapshots
    .filter(s => s.projects[projectId])
    .map(s => ({ date: s.date, overall: s.projects[projectId].overall }));
}
