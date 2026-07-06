import type { SectionKey, DataSource } from "./enums";
export type { SectionKey, DataSource, SectionStatus, EsmRole, ProjectStatus, DocumentStatus, ActorType, AuditAction } from "./enums";
export { SECTION_KEYS } from "./enums";
export type { Project, Milestone, ActionItem, Metric, DocumentInfo, CustomerContact, BrandingConfig, SmartsheetConfig } from "./models";

// ---------------------------------------------------------------------------
// Section ordering & display
// ---------------------------------------------------------------------------

export const SECTION_ORDER: SectionKey[] = [
  "CUSTOMER_PROFILE",
  "PHASE_SCOPE",
  "SUCCESS_CRITERIA",
  "PROJECT_TEAM",
  "GOVERNANCE",
  "COMMUNICATION",
  "RESPONSIBILITIES",
  "RISKS",
  "INSTITUTIONAL_PROFILE",
  "PROCUREMENT_GUIDELINES",
  "APPROVAL_WORKFLOW",
  "CATALOG_LANDSCAPE",
  "GL_STRUCTURE",
  "PO_PROCESS",
  "RECEIVING_PROCESS",
  "REPORTING_NEEDS",
  "DATA_FILES_PLAN",
  "TEST_PERMISSIONS",
  "POWER_USERS",
  "SSO_INFO",
  "ESM_TESTING_ACCESS",
  "TRANSACTION_PREFERENCES",
  "SIGNOFF",
];

export const SECTION_LABELS: Record<SectionKey, string> = {
  CUSTOMER_PROFILE: "1.1 Customer profile",
  PHASE_SCOPE: "1.2 Phase scope & timeline",
  SUCCESS_CRITERIA: "1.3 Success criteria & DoD",
  PROJECT_TEAM: "1.4 Project team & contacts",
  GOVERNANCE: "1.5 Governance & decision-making",
  COMMUNICATION: "1.6 Communication & cadence",
  RESPONSIBILITIES: "1.7 Customer responsibilities",
  RISKS: "1.8 Risks, assumptions, dependencies",
  INSTITUTIONAL_PROFILE: "2.1 Institutional profile",
  PROCUREMENT_GUIDELINES: "2.2 Procurement guidelines & spend thresholds",
  APPROVAL_WORKFLOW: "2.3 Current approval workflow",
  CATALOG_LANDSCAPE: "2.4 Catalog landscape",
  GL_STRUCTURE: "2.5 GL / FOAPAL structure",
  PO_PROCESS: "2.6 Current PO process & format",
  RECEIVING_PROCESS: "2.7 Current receiving process",
  REPORTING_NEEDS: "2.8 Reporting needs",
  DATA_FILES_PLAN: "3.1 Customer data files plan",
  TEST_PERMISSIONS: "3.2 Project team test permissions",
  POWER_USERS: "3.3 Power-user group",
  SSO_INFO: "3.4 SSO information & ESM SSO accounts",
  ESM_TESTING_ACCESS: "3.5 ESM team testing access",
  TRANSACTION_PREFERENCES: "3.6 Transaction copy & change order preferences",
  SIGNOFF: "Part 4 Sign-off",
};

export const PART_FOR_SECTION: Record<SectionKey, 1 | 2 | 3 | 4> = {
  CUSTOMER_PROFILE: 1,
  PHASE_SCOPE: 1,
  SUCCESS_CRITERIA: 1,
  PROJECT_TEAM: 1,
  GOVERNANCE: 1,
  COMMUNICATION: 1,
  RESPONSIBILITIES: 1,
  RISKS: 1,
  INSTITUTIONAL_PROFILE: 2,
  PROCUREMENT_GUIDELINES: 2,
  APPROVAL_WORKFLOW: 2,
  CATALOG_LANDSCAPE: 2,
  GL_STRUCTURE: 2,
  PO_PROCESS: 2,
  RECEIVING_PROCESS: 2,
  REPORTING_NEEDS: 2,
  DATA_FILES_PLAN: 3,
  TEST_PERMISSIONS: 3,
  POWER_USERS: 3,
  SSO_INFO: 3,
  ESM_TESTING_ACCESS: 3,
  TRANSACTION_PREFERENCES: 3,
  SIGNOFF: 4,
};

export const PART_LABELS: Record<1 | 2 | 3 | 4, string> = {
  1: "Part 1 — Project Framing",
  2: "Part 2 — Current State",
  3: "Part 3 — Pre-Build Decisions",
  4: "Part 4 — Sign-off",
};

export const WORKSHOP_SECTIONS: ReadonlySet<SectionKey> = new Set<SectionKey>([
  "PHASE_SCOPE",
  "GOVERNANCE",
  "RISKS",
  "APPROVAL_WORKFLOW",
  "GL_STRUCTURE",
  "REPORTING_NEEDS",
  "DATA_FILES_PLAN",
  "TEST_PERMISSIONS",
]);

export const DATA_SOURCE_FOR_SECTION: Record<SectionKey, DataSource> = {
  CUSTOMER_PROFILE: "SMARTSHEET",
  PHASE_SCOPE: "WORKSHOP",
  SUCCESS_CRITERIA: "CUSTOMER",
  PROJECT_TEAM: "CUSTOMER",
  GOVERNANCE: "WORKSHOP",
  COMMUNICATION: "SC",
  RESPONSIBILITIES: "CUSTOMER",
  RISKS: "WORKSHOP",
  INSTITUTIONAL_PROFILE: "CUSTOMER",
  PROCUREMENT_GUIDELINES: "CUSTOMER",
  APPROVAL_WORKFLOW: "WORKSHOP",
  CATALOG_LANDSCAPE: "CUSTOMER",
  GL_STRUCTURE: "WORKSHOP",
  PO_PROCESS: "CUSTOMER",
  RECEIVING_PROCESS: "CUSTOMER",
  REPORTING_NEEDS: "WORKSHOP",
  DATA_FILES_PLAN: "WORKSHOP",
  TEST_PERMISSIONS: "WORKSHOP",
  POWER_USERS: "CUSTOMER",
  SSO_INFO: "CUSTOMER",
  ESM_TESTING_ACCESS: "CUSTOMER",
  TRANSACTION_PREFERENCES: "CUSTOMER",
  SIGNOFF: "CUSTOMER",
};

// ---------------------------------------------------------------------------
// Section data types
// ---------------------------------------------------------------------------

export interface WorkshopAck {
  acknowledged?: boolean;
  customerNotes?: string;
}

export interface CustomerProfileData {
  institutionLegalName?: string;
  institutionType?: string;
  primaryMailingAddress?: string;
  erpProductVersion?: string;
  erpHosting?: string;
  esmModulesInScope?: string;
}

export type PhaseScopeData = WorkshopAck;

export interface SuccessCriteriaData {
  outcomes?: string;
  dodAccepted?: boolean;
}

export interface TeamMember {
  name?: string;
  title?: string;
  projectRole?: string;
  email?: string;
  phone?: string;
}
export interface ProjectTeamData {
  customerTeam?: TeamMember[];
  erpPartnerTeam?: TeamMember[];
}

export type GovernanceData = WorkshopAck;

export interface CommunicationData {
  statusCadenceConfirmed?: string;
  steeringCadenceConfirmed?: string;
  workstreamCadenceConfirmed?: string;
  customerTimeZone?: string;
  preferredMeetingPlatform?: string;
  blackoutPeriods?: string;
}

export interface ResponsibilityAssignment {
  responsibility: string;
  owner?: string;
  notes?: string;
}
export interface ResponsibilitiesData {
  assignments?: ResponsibilityAssignment[];
  acknowledged?: boolean;
}

export type RisksData = WorkshopAck;

export interface InstitutionalProfileData {
  institutionType?: string;
  governingAuthority?: string;
  procurementModel?: string;
  campusCount?: string;
}

export interface SpendTier {
  spendRange?: string;
  requirement?: string;
  appliesTo?: string;
}
export interface ProcurementGuidelinesData {
  spendTiers?: SpendTier[];
  taxStatus?: string;
  paymentTerms?: string;
  otherRules?: string;
  policyAttached?: boolean;
}

export type ApprovalWorkflowData = WorkshopAck;

export interface CatalogSupplier {
  supplier?: string;
  tier?: "Preferred" | "Contracted" | "Approved" | "";
}
export interface CatalogLandscapeData {
  suppliers?: CatalogSupplier[];
  existingContracts?: string;
  nonCatalogAllowed?: string;
}

export type GlStructureData = WorkshopAck;

export interface PoProcessData {
  standardTerms?: string;
  distributionMethod?: string;
  whoCanRequestChanges?: string;
  changesRequireReapproval?: string;
  samplePoAttached?: boolean;
}

export interface ReceivingProcessData {
  receivingModel?: string;
  centralReceivingAddress?: string;
  whoPerforms?: string;
  quantityValueOrBoth?: string;
  partialReceiptsAllowed?: string;
  overReceiptsAllowed?: string;
  serviceReceivingModel?: string;
}

export type ReportingNeedsData = WorkshopAck;
export type DataFilesPlanData = WorkshopAck;
export type TestPermissionsData = WorkshopAck;

export interface PowerUser {
  name?: string;
  department?: string;
  role?: "Shopper" | "Requisitioner" | "Approver" | "Receiver" | "";
  trainingDate?: string;
}
export interface PowerUsersData {
  users?: PowerUser[];
}

export interface SsoInfoData {
  ssoType?: string;
  idpProductVersion?: string;
  idpAdminName?: string;
  idpAdminEmail?: string;
  idpAdminPhone?: string;
  mfaEnforced?: string;
  provisioningApproach?: string;
  trainingMetadataUrl?: string;
  productionMetadataUrl?: string;
  trainingMetadataUploaded?: boolean;
  productionMetadataUploaded?: boolean;
  esmAccountsAcknowledged?: boolean;
}

export interface EsmTestingAccessData {
  apiKeyTraining?: string;
  apiKeyProduction?: string;
  bannerTenetTraining?: string;
  bannerTenetProduction?: string;
  esmAccountsAcknowledged?: boolean;
}

export type YNT = "Y" | "N" | "TBD" | "";

export interface CopyFieldRow {
  field: string;
  allow?: YNT;
  notes?: string;
}
export interface ChangeFieldRow {
  field: string;
  allow?: YNT;
  notes?: string;
}
export interface TransactionPreferencesData {
  copy?: CopyFieldRow[];
  change?: ChangeFieldRow[];
}

export interface SignoffRow {
  role: string;
  name?: string;
  date?: string;
  confirmed?: boolean;
}
export interface SignoffData {
  rows?: SignoffRow[];
}

// ---------------------------------------------------------------------------
// Defaults & static lists
// ---------------------------------------------------------------------------

export const COPY_FIELDS_DEFAULT: CopyFieldRow[] = [
  { field: "External Notes (Header Level)" },
  { field: "Internal Notes (Header Level)" },
  { field: "Aux Field 1 (Header & Line Item)" },
  { field: "Aux Field 2 (Header & Line Item)" },
  { field: "Aux Field 3 (Header & Line Item)" },
  { field: "Aux Field 4 (Header & Line Item)" },
  { field: "Aux Field 5 (Header & Line Item)" },
  { field: "Aux Field 6 (Header & Line Item)" },
  { field: "Aux Field 7 (Header & Line Item)" },
  { field: "Aux Field 8 (Header & Line Item)" },
  { field: "Commodity Code (Header & Line Item)" },
  { field: "External Notes (Line Item)" },
  { field: "Internal Notes (Line Item)" },
  { field: "Ship To Location" },
  { field: "Bill To Location" },
];

export const CHANGE_FIELDS_DEFAULT: ChangeFieldRow[] = [
  { field: "External Notes (Header Level)" },
  { field: "External Notes (Line Item Level)" },
  { field: "Aux Field 1 (Header and Line Items)" },
  { field: "Aux Field 2 (Header and Line Items)" },
  { field: "Aux Field 3 (Header and Line Items)" },
  { field: "Aux Field 4 (Header and Line Items)" },
  { field: "Aux Field 5 (Header and Line Items)" },
  { field: "Aux Field 6 (Header and Line Items)" },
  { field: "Aux Field 7 (Header and Line Items)" },
  { field: "Aux Field 8 (Header and Line Items)" },
  { field: "Item / Service" },
  { field: "Quantity — Unreceived Transactions" },
  { field: "Fiscal Date" },
  { field: "Add Item" },
];

export const RESPONSIBILITIES_DEFAULT: ResponsibilityAssignment[] = [
  { responsibility: "Executive sponsorship and project authorization" },
  { responsibility: "Day-to-day project lead and operational decisions" },
  { responsibility: "Functional validation and UAT participation" },
  { responsibility: "Provide approval queue mappings (in Workflow Document, closer to production)" },
  { responsibility: "Provide data file templates populated (Account Code, Location, UOM, Non-Catalog Vendor, User)" },
  { responsibility: "ERP / integration coordination" },
  { responsibility: "SSO configuration and testing" },
  { responsibility: "Network connectivity for integrations" },
  { responsibility: "Supplier outreach and catalog validation" },
  { responsibility: "Train-the-Trainer participation" },
  { responsibility: "Power-user identification and readiness" },
  { responsibility: "Go-Live authorization" },
];

export const SIGNOFF_ROLES = [
  "Executive Sponsor (Customer)",
  "Project Lead (Customer)",
  "IT / Technical Lead (Customer)",
  "ESM Solution Consultant",
  "ESM Project Manager",
];

export const CATALOG_SUPPLIER_SLOTS = 10;
