import type { Project, Milestone, ActionItem, RaidLogItem } from "@/types/models";
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
    velocityTrend: number;
  };
  signals: HealthSignal[];
  prediction: RiskPrediction;
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

const WEIGHTS = {
  milestoneHealth: 0.30,
  actionItemHealth: 0.25,
  raidHealth: 0.15,
  timelinePressure: 0.15,
  velocityTrend: 0.15,
};

function scoreMilestoneHealth(milestones: Milestone[]): { score: number; stats: ProjectAnalytics["milestoneStats"] } {
  const level2 = milestones.filter(m => m.level === 2 || m.isMilestone);
  const total = level2.length;
  if (total === 0) return { score: 70, stats: { total: 0, completed: 0, inProgress: 0, overdue: 0, completionRate: 0 } };

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

  const completionRate = total > 0 ? completed / total : 0;
  const overdueRatio = total > 0 ? overdue / total : 0;
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
  if (total === 0) return { score: 80, stats: { total: 0, completed: 0, overdue: 0, highPriority: 0, overdueRate: 0 } };

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
  const completionRate = total > 0 ? completed / total : 0;

  let score = 40 + (completionRate * 35);
  score -= overdueRate * 35;
  score -= (highPriority / Math.max(open.length, 1)) * 10;

  return {
    score: Math.max(0, Math.min(100, Math.round(score))),
    stats: { total, completed, overdue, highPriority, overdueRate: Math.round(overdueRate * 100) },
  };
}

function scoreRaidHealth(items: RaidLogItem[]): { score: number; stats: ProjectAnalytics["raidStats"] } {
  const openItems = items.filter(i => i.status !== "Complete");
  const openRisks = openItems.filter(i => i.type === "Risk").length;
  const openIssues = openItems.filter(i => i.type === "Issue").length;
  const blockedItems = openItems.filter(i => i.status === "Blocked").length;
  const highPriorityOpen = openItems.filter(i => i.priority === "High").length;

  if (items.length === 0) return { score: 80, stats: { openRisks: 0, openIssues: 0, blockedItems: 0, highPriorityOpen: 0 } };

  let score = 90;
  score -= openRisks * 5;
  score -= openIssues * 4;
  score -= blockedItems * 8;
  score -= highPriorityOpen * 6;

  return {
    score: Math.max(0, Math.min(100, Math.round(score))),
    stats: { openRisks, openIssues, blockedItems, highPriorityOpen },
  };
}

function scoreTimelinePressure(project: Project): { score: number; stats: ProjectAnalytics["timelineStats"] } {
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  if (!project.goLiveDate) {
    return { score: 70, stats: { daysToGoLive: null, daysElapsed: null, totalDuration: null, percentElapsed: null } };
  }

  const goLive = parseLocalDate(project.goLiveDate);
  const daysToGoLive = Math.ceil((goLive.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  let daysElapsed: number | null = null;
  let totalDuration: number | null = null;
  let percentElapsed: number | null = null;

  if (project.startDate) {
    const start = parseLocalDate(project.startDate);
    daysElapsed = Math.ceil((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    totalDuration = Math.ceil((goLive.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    percentElapsed = totalDuration > 0 ? Math.round((daysElapsed / totalDuration) * 100) : null;
  }

  let score: number;
  if (daysToGoLive < 0) score = 15;
  else if (daysToGoLive <= 7) score = 30;
  else if (daysToGoLive <= 14) score = 45;
  else if (daysToGoLive <= 30) score = 60;
  else if (daysToGoLive <= 60) score = 75;
  else if (daysToGoLive <= 90) score = 85;
  else score = 95;

  return {
    score: Math.max(0, Math.min(100, score)),
    stats: { daysToGoLive, daysElapsed, totalDuration, percentElapsed },
  };
}

function estimateVelocityTrend(milestones: Milestone[], actionItems: ActionItem[]): number {
  const completedMilestones = milestones.filter(m => m.status === "complete").length;
  const totalMilestones = milestones.filter(m => m.level === 2 || m.isMilestone).length;

  const completedActions = actionItems.filter(i => {
    const s = i.status.toLowerCase();
    return s === "complete" || s === "completed" || s === "done";
  }).length;
  const totalActions = actionItems.length;

  if (totalMilestones === 0 && totalActions === 0) return 70;

  const milestoneVelocity = totalMilestones > 0 ? completedMilestones / totalMilestones : 0.5;
  const actionVelocity = totalActions > 0 ? completedActions / totalActions : 0.5;

  const velocity = (milestoneVelocity * 0.6 + actionVelocity * 0.4);

  return Math.max(0, Math.min(100, Math.round(velocity * 100)));
}

function generateSignals(
  milestoneStats: ProjectAnalytics["milestoneStats"],
  actionItemStats: ProjectAnalytics["actionItemStats"],
  raidStats: ProjectAnalytics["raidStats"],
  timelineStats: ProjectAnalytics["timelineStats"],
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
  if (actionItemStats.highPriority === 0 && raidStats.blockedItems === 0 && milestoneStats.overdue === 0) signals.push({ type: "positive", label: "No critical blockers" });

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

  let trend: RiskPrediction["trend"] = "stable";
  if (criticalCount >= 2) trend = "declining";
  else if (positiveCount >= 2 && criticalCount === 0) trend = "improving";

  return { slipProbability, primaryRisk, trend };
}

export function computeHealthScore(
  project: Project,
  milestones: Milestone[],
  actionItems: ActionItem[],
  raidItems: RaidLogItem[],
): ProjectAnalytics {
  const { score: milestoneScore, stats: milestoneStats } = scoreMilestoneHealth(milestones);
  const { score: actionItemScore, stats: actionItemStats } = scoreActionItemHealth(actionItems);
  const { score: raidScore, stats: raidStats } = scoreRaidHealth(raidItems);
  const { score: timelineScore, stats: timelineStats } = scoreTimelinePressure(project);
  const velocityScore = estimateVelocityTrend(milestones, actionItems);

  const components = {
    milestoneHealth: milestoneScore,
    actionItemHealth: actionItemScore,
    raidHealth: raidScore,
    timelinePressure: timelineScore,
    velocityTrend: velocityScore,
  };

  const overall = Math.round(
    components.milestoneHealth * WEIGHTS.milestoneHealth +
    components.actionItemHealth * WEIGHTS.actionItemHealth +
    components.raidHealth * WEIGHTS.raidHealth +
    components.timelinePressure * WEIGHTS.timelinePressure +
    components.velocityTrend * WEIGHTS.velocityTrend
  );

  const signals = generateSignals(milestoneStats, actionItemStats, raidStats, timelineStats);

  return {
    project,
    healthScore: {
      overall,
      grade: computeGrade(overall),
      riskLevel: computeRiskLevel(overall),
      components,
      signals,
      prediction: computePrediction(components, signals),
    },
    milestoneStats,
    actionItemStats,
    raidStats,
    timelineStats,
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
