import type { ProjectStatus, DocumentStatus } from "./enums";

export interface BrandingConfig {
  accentColor?: string;
  logoUrl?: string;
}

export interface SmartsheetConfig {
  workspaceId?: string;
  customerFolderId?: string;
  customerAccessSheetId?: string;
  intakeSheetId?: string;
  milestoneSheetId?: string;
  actionItemSheetId?: string;
  metricsSheetId?: string;
  documentSheetId?: string;
  projectPlanSheetId?: string;
  raidLogSheetId?: string;
  integrationTrackerSheetId?: string;
  meetingTrackerSheetId?: string;
  projectInfoSheetId?: string;
}

export interface Project {
  id: string;
  customerName: string;
  projectName: string;
  products: string[];
  scName: string;
  scEmail: string;
  pmName?: string;
  pmEmail?: string;
  startDate?: string;
  goLiveDate?: string;
  currentPhase: string;
  status: ProjectStatus;
  branding: BrandingConfig;
  smartsheetConfig: SmartsheetConfig;
  sectionVisibility: Record<string, boolean>;
  documentTypes?: string[];
  sharepointFolderUrl?: string;
  sharepointFolderId?: string;
}

export interface Milestone {
  id: string;
  name: string;
  date?: string;
  startDate?: string;
  endDate?: string;
  status: string;
  phase?: string;
  percentComplete?: number;
}

export interface ActionItem {
  id: string;
  description: string;
  owner?: string;
  dueDate?: string;
  priority: string;
  status: string;
}

export interface Metric {
  id: string;
  metricType: string;
  current: number;
  total: number;
  label?: string;
}

export interface DocumentInfo {
  id: string;
  type: string;
  name: string;
  status: DocumentStatus;
  fileSize: number | null;
  generatedAt: string | null;
  downloads: number;
  smartsheetAttachmentId?: number;
  linkUrl?: string;
}

export interface RaidLogItem {
  id: string;
  itemId: string;
  item: string;
  type: "Risk" | "Action" | "Issue" | "Decision";
  status: "New" | "In Progress" | "Blocked" | "Complete";
  priority: "High" | "Medium" | "Low";
  notes: string;
  assigned: string;
  targetDate: string | null;
}

export interface Meeting {
  id: string;
  week: string;
  days: string;
  phase: string;
  milestone: string;
  meetingDate: string | null;
  status: "Upcoming" | "Scheduled" | "Complete" | "Skipped";
  scPrepItems: string;
  agendaSummary: string;
  customerDeliverables: string;
  notes: string;
  actionItemsLogged: boolean;
  recapSent: boolean;
}

export interface CustomerContact {
  email: string;
  name?: string;
  role?: string;
}
