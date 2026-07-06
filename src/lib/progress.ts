import type { SectionKey } from "@/types/enums";
import {
  WORKSHOP_SECTIONS,
  RESPONSIBILITIES_DEFAULT,
  type CustomerProfileData,
  type SuccessCriteriaData,
  type ProjectTeamData,
  type CommunicationData,
  type ResponsibilitiesData,
  type InstitutionalProfileData,
  type ProcurementGuidelinesData,
  type CatalogLandscapeData,
  type PoProcessData,
  type ReceivingProcessData,
  type PowerUsersData,
  type SsoInfoData,
  type EsmTestingAccessData,
  type TransactionPreferencesData,
  type SignoffData,
  type WorkshopAck,
} from "@/types";

function hasValue(v: unknown): boolean {
  if (v === null || v === undefined) return false;
  if (typeof v === "string") return v.trim().length > 0;
  if (Array.isArray(v)) return v.length > 0;
  return true;
}

function isComplete_CUSTOMER_PROFILE(d: CustomerProfileData): boolean {
  return [
    d.institutionLegalName,
    d.institutionType,
    d.primaryMailingAddress,
    d.erpProductVersion,
    d.erpHosting,
    d.esmModulesInScope,
  ].every(hasValue);
}

function isComplete_SUCCESS_CRITERIA(d: SuccessCriteriaData): boolean {
  return hasValue(d.outcomes) && Boolean(d.dodAccepted);
}

function isComplete_PROJECT_TEAM(d: ProjectTeamData): boolean {
  if (!d.customerTeam || d.customerTeam.length === 0) return false;
  return d.customerTeam.some((m) => hasValue(m.name) && hasValue(m.email) && hasValue(m.projectRole));
}

function isComplete_COMMUNICATION(d: CommunicationData): boolean {
  return [
    d.statusCadenceConfirmed,
    d.steeringCadenceConfirmed,
    d.workstreamCadenceConfirmed,
    d.customerTimeZone,
    d.preferredMeetingPlatform,
  ].every(hasValue);
}

function isComplete_RESPONSIBILITIES(d: ResponsibilitiesData): boolean {
  if (!d.assignments || d.assignments.length < RESPONSIBILITIES_DEFAULT.length) return false;
  return d.assignments.every((a) => hasValue(a.owner));
}

function isComplete_INSTITUTIONAL_PROFILE(d: InstitutionalProfileData): boolean {
  return [d.institutionType, d.governingAuthority, d.procurementModel, d.campusCount].every(hasValue);
}

function isComplete_PROCUREMENT_GUIDELINES(d: ProcurementGuidelinesData): boolean {
  if (!d.spendTiers || d.spendTiers.length === 0) return false;
  const validTier = d.spendTiers.some((t) => hasValue(t.spendRange) && hasValue(t.requirement));
  return validTier && hasValue(d.taxStatus) && hasValue(d.paymentTerms);
}

function isComplete_CATALOG_LANDSCAPE(d: CatalogLandscapeData): boolean {
  if (!d.suppliers || d.suppliers.length === 0) return false;
  const hasAtLeastOne = d.suppliers.some((s) => hasValue(s.supplier));
  return hasAtLeastOne && hasValue(d.nonCatalogAllowed);
}

function isComplete_PO_PROCESS(d: PoProcessData): boolean {
  return [d.standardTerms, d.distributionMethod, d.whoCanRequestChanges, d.changesRequireReapproval].every(hasValue);
}

function isComplete_RECEIVING_PROCESS(d: ReceivingProcessData): boolean {
  return [
    d.receivingModel,
    d.whoPerforms,
    d.quantityValueOrBoth,
    d.partialReceiptsAllowed,
    d.overReceiptsAllowed,
    d.serviceReceivingModel,
  ].every(hasValue);
}

function isComplete_POWER_USERS(d: PowerUsersData): boolean {
  if (!d.users || d.users.length === 0) return false;
  return d.users.some((u) => hasValue(u.name) && hasValue(u.role));
}

function isComplete_SSO_INFO(d: SsoInfoData): boolean {
  const baseFields = [d.ssoType, d.idpProductVersion, d.idpAdminName, d.idpAdminEmail, d.mfaEnforced, d.provisioningApproach];
  if (!baseFields.every(hasValue)) return false;
  const hasTraining = hasValue(d.trainingMetadataUrl) || d.trainingMetadataUploaded === true;
  const hasProduction = hasValue(d.productionMetadataUrl) || d.productionMetadataUploaded === true;
  return hasTraining && hasProduction && Boolean(d.esmAccountsAcknowledged);
}

function isComplete_ESM_TESTING_ACCESS(d: EsmTestingAccessData): boolean {
  return hasValue(d.apiKeyTraining) && hasValue(d.apiKeyProduction) && Boolean(d.esmAccountsAcknowledged);
}

function isComplete_TRANSACTION_PREFERENCES(d: TransactionPreferencesData): boolean {
  if (!d.copy || !d.change) return false;
  const copyOk = d.copy.every((r) => r.allow === "Y" || r.allow === "N" || r.allow === "TBD");
  const changeOk = d.change.every((r) => r.allow === "Y" || r.allow === "N" || r.allow === "TBD");
  return copyOk && changeOk;
}

function isComplete_SIGNOFF(d: SignoffData): boolean {
  if (!d.rows || d.rows.length === 0) return false;
  return d.rows.every((r) => hasValue(r.name) && hasValue(r.date) && r.confirmed === true);
}

function isComplete_WORKSHOP(d: WorkshopAck): boolean {
  return Boolean(d.acknowledged);
}

export function isSectionComplete(key: SectionKey, formData: unknown): boolean {
  const d = (formData ?? {}) as Record<string, unknown>;
  if (WORKSHOP_SECTIONS.has(key)) {
    return isComplete_WORKSHOP(d as WorkshopAck);
  }
  switch (key) {
    case "CUSTOMER_PROFILE":
      return isComplete_CUSTOMER_PROFILE(d as CustomerProfileData);
    case "SUCCESS_CRITERIA":
      return isComplete_SUCCESS_CRITERIA(d as SuccessCriteriaData);
    case "PROJECT_TEAM":
      return isComplete_PROJECT_TEAM(d as unknown as ProjectTeamData);
    case "COMMUNICATION":
      return isComplete_COMMUNICATION(d as CommunicationData);
    case "RESPONSIBILITIES":
      return isComplete_RESPONSIBILITIES(d as unknown as ResponsibilitiesData);
    case "INSTITUTIONAL_PROFILE":
      return isComplete_INSTITUTIONAL_PROFILE(d as InstitutionalProfileData);
    case "PROCUREMENT_GUIDELINES":
      return isComplete_PROCUREMENT_GUIDELINES(d as unknown as ProcurementGuidelinesData);
    case "CATALOG_LANDSCAPE":
      return isComplete_CATALOG_LANDSCAPE(d as unknown as CatalogLandscapeData);
    case "PO_PROCESS":
      return isComplete_PO_PROCESS(d as PoProcessData);
    case "RECEIVING_PROCESS":
      return isComplete_RECEIVING_PROCESS(d as ReceivingProcessData);
    case "POWER_USERS":
      return isComplete_POWER_USERS(d as unknown as PowerUsersData);
    case "SSO_INFO":
      return isComplete_SSO_INFO(d as SsoInfoData);
    case "ESM_TESTING_ACCESS":
      return isComplete_ESM_TESTING_ACCESS(d as EsmTestingAccessData);
    case "TRANSACTION_PREFERENCES":
      return isComplete_TRANSACTION_PREFERENCES(d as unknown as TransactionPreferencesData);
    case "SIGNOFF":
      return isComplete_SIGNOFF(d as unknown as SignoffData);
    default:
      return false;
  }
}

export function isSectionStarted(formData: unknown): boolean {
  const d = (formData ?? {}) as Record<string, unknown>;
  return Object.values(d).some(hasValue);
}

export function calcIntakePercent(completedCount: number, totalCount: number): number {
  if (totalCount === 0) return 0;
  return Math.round((completedCount / totalCount) * 100);
}
