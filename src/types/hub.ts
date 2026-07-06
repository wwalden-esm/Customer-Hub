export interface HubMilestone {
  id: string;
  name: string;
  date: string | null;
  startDate: string | null;
  endDate: string | null;
  status: "complete" | "current" | "upcoming" | "overdue" | "in-progress";
  phase: string | null;
  percentComplete: number | null;
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
}

export interface HubDashboardData {
  project: {
    id: string;
    customerName: string;
    projectName: string;
    products: string[];
    scName: string;
    scEmail: string;
    goLiveDate: string | null;
    currentPhase: string;
    status: "ON_TRACK" | "AT_RISK" | "OFF_TRACK";
    branding: { logoUrl?: string; accentColor?: string };
  };
  milestones: HubMilestone[];
  actionItems: HubActionItem[];
  metrics: HubMetric[];
  intakePercent: number;
  daysToGoLive: number | null;
  activity: ActivityEvent[];
  upcomingMeetings: HubUpcomingMeeting[];
}
