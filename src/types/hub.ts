export interface HubMilestone {
  id: string;
  name: string;
  date: string | null;
  startDate: string | null;
  endDate: string | null;
  status: "complete" | "current" | "upcoming" | "overdue" | "in-progress" | "on-hold";
  phase: string | null;
  percentComplete: number | null;
  isMilestone?: boolean;
  health?: "Green" | "Yellow" | "Red" | "Blue";
  level?: 1 | 2;
}

export interface ActivityEvent {
  id: string;
  type: "milestone" | "document" | "raid" | "status" | "upload" | "system";
  title: string;
  detail: string | null;
  timestamp: string;
  actor: string | null;
}

export interface HubActionItem {
  id: string;
  description: string;
  owner: string | null;
  dueDate: string | null;
  priority: "high" | "medium" | "low";
  status: "open" | "in-progress" | "done";
  isOverdue: boolean;
}

export interface HubMetric {
  metricType: string;
  current: number;
  total: number;
  label: string | null;
  percent: number;
}

export interface HubUpcomingMeeting {
  id: string;
  week: string;
  milestone: string;
  meetingDate: string | null;
  status: string;
  agendaSummary: string;
  customerDeliverables: string;
}

export interface HubIntegration {
  id: string;
  name: string;
  status: string;
}

export interface HubLink {
  label: string;
  url: string;
  icon?: string;
}

export interface HubTeamMember {
  name: string;
  role: string;
  email?: string;
}

export interface HubDecision {
  id: string;
  item: string;
  status: string;
  notes: string;
  date: string | null;
}

export interface HubDeadline {
  id: string;
  name: string;
  dueDate: string;
  source: "action" | "milestone" | "meeting" | "deliverable";
  owner: string | null;
  daysUntil: number;
}

export interface GoLiveReadinessItem {
  label: string;
  done: boolean;
  detail: string | null;
}

export interface HubDashboardData {
  project: {
    id: string;
    customerName: string;
    projectName: string;
    products: string[];
    scName: string;
    scEmail: string;
    pmName?: string;
    pmEmail?: string;
    startDate: string | null;
    goLiveDate: string | null;
    currentPhase: string;
    status: "ON_TRACK" | "AT_RISK" | "OFF_TRACK";
    branding: { logoUrl?: string; accentColor?: string };
  };
  milestones: HubMilestone[];
  actionItems: HubActionItem[];
  customerActionItems: HubActionItem[];
  metrics: HubMetric[];
  intakePercent: number;
  daysToGoLive: number | null;
  daysElapsed: number | null;
  totalDays: number | null;
  activity: ActivityEvent[];
  upcomingMeetings: HubUpcomingMeeting[];
  links: HubLink[];
  team: HubTeamMember[];
  integrations: HubIntegration[];
  sheetPermalinks: Record<string, string | undefined>;
  decisions: HubDecision[];
  deadlines: HubDeadline[];
  goLiveReadiness: GoLiveReadinessItem[];
  trainingProgress: { completed: number; total: number } | null;
  healthHistory: Array<{ week: string; status: "ON_TRACK" | "AT_RISK" | "OFF_TRACK" }>;
  documentTypes: string[];
  contactName: string | null;
}
