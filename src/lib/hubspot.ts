const HUBSPOT_BASE = "https://api.hubapi.com";

function token(): string {
  const t = process.env.HUBSPOT_API_KEY;
  if (!t) throw new Error("HUBSPOT_API_KEY is not set");
  return t;
}

export async function hubspotFetch<T>(path: string): Promise<T> {
  const res = await fetch(`${HUBSPOT_BASE}${path}`, {
    headers: { Authorization: `Bearer ${token()}` },
    next: { revalidate: 60 },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`HubSpot API ${res.status}: ${body}`);
  }
  return res.json() as Promise<T>;
}

interface HubSpotObject {
  id: string;
  properties: Record<string, string | null>;
  createdAt: string;
  updatedAt: string;
}

const INTAKE_OBJECT_TYPE = "2-65056886";

const INTAKE_PROPERTIES = [
  "create_customer_hub",
  "customer",
  "customer_project_lead",
  "date_due_initial_draft",
  "date_issued",
  "erp_hosting",
  "erpfinancial_system",
  "erpfinancial_system_version",
  "esm_solution_consultant",
  "implementation_project_name",
  "institution_legal_name",
  "institution_type",
  "modules_in_scope",
  "primary_mailing_address",
  "project_template",
  "target_golive",
];

export async function getIntakeRecord(recordId: string): Promise<HubSpotObject> {
  const props = INTAKE_PROPERTIES.join(",");
  return hubspotFetch<HubSpotObject>(
    `/crm/v3/objects/${INTAKE_OBJECT_TYPE}/${recordId}?properties=${props}`,
  );
}

export async function listIntakeRecords(): Promise<HubSpotObject[]> {
  const props = INTAKE_PROPERTIES.join(",");
  const data = await hubspotFetch<{ results: HubSpotObject[] }>(
    `/crm/v3/objects/${INTAKE_OBJECT_TYPE}?properties=${props}&limit=100`,
  );
  return data.results;
}

// HubSpot owner properties store numeric IDs — resolve to display name
export async function resolveOwnerName(ownerId: string): Promise<string | null> {
  try {
    const owner = await hubspotFetch<{
      id: string;
      firstName?: string;
      lastName?: string;
      email?: string;
    }>(`/crm/v3/owners/${ownerId}`);
    const parts = [owner.firstName, owner.lastName].filter(Boolean);
    return parts.length > 0 ? parts.join(" ") : owner.email || null;
  } catch {
    return null;
  }
}

export interface IntakeField {
  key: string;
  label: string;
  value: string | null;
  type: "text" | "date" | "select" | "multiselect";
}

export interface IntakeDisplayData {
  recordId: string;
  updatedAt: string;
  fields: IntakeField[];
}

const FIELD_META: Record<string, { label: string; type: IntakeField["type"] }> = {
  implementation_project_name: { label: "Implementation Project Name", type: "text" },
  customer: { label: "Customer", type: "text" },
  institution_legal_name: { label: "Institution Legal Name", type: "text" },
  institution_type: { label: "Institution Type", type: "select" },
  primary_mailing_address: { label: "Primary Mailing Address", type: "text" },
  customer_project_lead: { label: "Customer Project Lead", type: "text" },
  esm_solution_consultant: { label: "ESM Solution Consultant", type: "text" },
  erpfinancial_system: { label: "ERP/Financial System", type: "select" },
  erpfinancial_system_version: { label: "ERP/Financial System Version", type: "text" },
  erp_hosting: { label: "ERP Hosting", type: "select" },
  modules_in_scope: { label: "Modules in Scope", type: "multiselect" },
  target_golive: { label: "Target Go-Live", type: "date" },
  date_due_initial_draft: { label: "Date Due (Initial Draft)", type: "date" },
  date_issued: { label: "Date Issued", type: "date" },
};

export async function normalizeIntakeData(record: HubSpotObject): Promise<IntakeDisplayData> {
  const fields: IntakeField[] = [];

  for (const [key, meta] of Object.entries(FIELD_META)) {
    let value = record.properties[key] || null;
    if (key === "esm_solution_consultant" && value && /^\d+$/.test(value)) {
      value = await resolveOwnerName(value) || value;
    }
    fields.push({ key, label: meta.label, value, type: meta.type });
  }

  return {
    recordId: record.id,
    updatedAt: record.updatedAt,
    fields,
  };
}
