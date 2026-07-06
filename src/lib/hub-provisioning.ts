import { readFile, writeFile } from "fs/promises";
import path from "path";
import crypto from "crypto";
import { listIntakeRecords } from "./hubspot";
import {
  ssFetch,
  addRows,
  updateRows,
  columnIdMap,
  getSheet,
  copySheetToFolder,
  createFolderInWorkspace,
  createFolderInFolder,
} from "./smartsheet";

interface ProjectConfig {
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
  status: string;
  branding: { accentColor: string };
  hubspotIntakeId: string;
  smartsheetConfig: Record<string, string>;
  sectionVisibility: Record<string, boolean>;
  password: string;
  institutionLegalName?: string;
  institutionType?: string;
  customerProjectLead?: string;
  primaryMailingAddress?: string;
  erpSystem?: string;
  erpVersion?: string;
  erpHosting?: string;
  projectTemplate?: string;
  dateDueInitialDraft?: string;
  sharepointFolderUrl?: string;
  sharepointFolderId?: string;
}

const PROJECTS_PATH = path.join(process.cwd(), "config", "projects.json");

async function readProjects(): Promise<Record<string, ProjectConfig>> {
  const raw = await readFile(PROJECTS_PATH, "utf-8");
  return JSON.parse(raw);
}

async function writeProjects(projects: Record<string, ProjectConfig>) {
  await writeFile(PROJECTS_PATH, JSON.stringify(projects, null, 2) + "\n", "utf-8");
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function generatePassword(customerName: string): string {
  const base = customerName.replace(/[^a-zA-Z]/g, "").slice(0, 12);
  const suffix = crypto.randomInt(1000, 9999);
  return `${base}${suffix}`;
}

export interface ProvisionResult {
  created: Array<{ projectId: string; customerName: string; hubspotRecordId: string }>;
  skipped: number;
}

interface HubSpotRecord {
  id: string;
  properties: Record<string, string | null>;
}

function extractProjectData(record: HubSpotRecord) {
  const customerName = record.properties.customer
    || record.properties.institution_legal_name
    || "Unknown Customer";
  const projectName = record.properties.implementation_project_name
    || `${customerName} Implementation`;
  const modules = record.properties.modules_in_scope;
  const products = modules
    ? modules.split(";").map((m) => m.trim()).filter(Boolean)
    : [];
  const scName = record.properties.esm_solution_consultant || "";
  const goLiveDate = record.properties.target_golive || undefined;
  const projectTemplate = record.properties.project_template || undefined;
  const institutionLegalName = record.properties.institution_legal_name || undefined;
  const institutionType = record.properties.institution_type || undefined;
  const customerProjectLead = record.properties.customer_project_lead || undefined;
  const primaryMailingAddress = record.properties.primary_mailing_address || undefined;
  const erpSystem = record.properties.erpfinancial_system || undefined;
  const erpVersion = record.properties.erpfinancial_system_version || undefined;
  const erpHosting = record.properties.erp_hosting || undefined;
  const dateDueInitialDraft = record.properties.date_due_initial_draft || undefined;

  return {
    customerName, projectName, products, scName, goLiveDate, projectTemplate,
    institutionLegalName, institutionType, customerProjectLead, primaryMailingAddress,
    erpSystem, erpVersion, erpHosting, dateDueInitialDraft,
  };
}

function pickProjectId(slug: string, existing: Record<string, unknown>): string {
  let projectId = slug;
  let counter = 2;
  while (existing[projectId]) {
    projectId = `${slug}-${counter++}`;
  }
  return projectId;
}

// ---------------------------------------------------------------------------
// Template workspace mapping
// ---------------------------------------------------------------------------

const TEMPLATE_WORKSPACE_MAP: Record<string, string | undefined> = {
  "standard template": process.env.SMARTSHEET_TEMPLATE_STANDARD,
  "contract only": process.env.SMARTSHEET_TEMPLATE_CONTRACT_ONLY,
};

function getTemplateWorkspaceId(projectTemplate: string | undefined): string | null {
  if (!projectTemplate) return null;
  const key = projectTemplate.toLowerCase().trim();
  for (const [pattern, wsId] of Object.entries(TEMPLATE_WORKSPACE_MAP)) {
    if (key.includes(pattern) && wsId) return wsId;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Default date offsets per product section (months from project start date)
// ---------------------------------------------------------------------------

interface SectionDateRule {
  sectionName: string;
  firstLeafStartOffset?: number;
  lastLeafStartOffset?: number;
}

const SECTION_DATE_RULES: SectionDateRule[] = [
  { sectionName: "Project Initiation", firstLeafStartOffset: 0 },
  { sectionName: "ESM Purchase", firstLeafStartOffset: 0, lastLeafStartOffset: 4 },
  { sectionName: "Contract Repository", firstLeafStartOffset: 0, lastLeafStartOffset: 1 },
  { sectionName: "Storeroom", firstLeafStartOffset: 0, lastLeafStartOffset: 2 },
  { sectionName: "Source", firstLeafStartOffset: 0, lastLeafStartOffset: 2 },
  { sectionName: "Supplier", firstLeafStartOffset: 0, lastLeafStartOffset: 2 },
];

function addMonths(dateStr: string, months: number): string {
  const d = new Date(dateStr + "T00:00:00");
  d.setMonth(d.getMonth() + months);
  return d.toISOString().slice(0, 10);
}

type SheetRow = {
  id: number;
  parentId?: number;
  cells: Array<{ columnId: number; value?: string | number | boolean | null; displayValue?: string }>;
};

async function seedDefaultDates(sheetId: string, startDate: string) {
  try {
    const sheet = await getSheet(sheetId);
    const cols = columnIdMap(sheet);
    const nameCol = cols.get("Milestone / Task Name") ?? cols.get("Task");
    const startCol = cols.get("Start Date");
    if (!nameCol || !startCol) return;

    const detailedSheet = await ssFetch<{ rows: SheetRow[] }>(
      `/sheets/${sheetId}?include=objectValue`,
    );
    const rows = detailedSheet.rows;

    // Build parent→children map
    const childrenOf = new Map<number, SheetRow[]>();
    for (const row of rows) {
      if (row.parentId) {
        const siblings = childrenOf.get(row.parentId) || [];
        siblings.push(row);
        childrenOf.set(row.parentId, siblings);
      }
    }

    // Find first and last leaf descendants of a row
    const firstLeaf = (rowId: number): SheetRow | null => {
      const children = childrenOf.get(rowId);
      if (!children || children.length === 0) {
        return rows.find((r) => r.id === rowId) ?? null;
      }
      return firstLeaf(children[0].id);
    };

    const lastLeaf = (rowId: number): SheetRow | null => {
      const children = childrenOf.get(rowId);
      if (!children || children.length === 0) {
        return rows.find((r) => r.id === rowId) ?? null;
      }
      return lastLeaf(children[children.length - 1].id);
    };

    // Build name→row lookup for section rows (first parent match wins)
    const nameToRow = new Map<string, SheetRow>();
    for (const row of rows) {
      const cell = row.cells.find((c) => c.columnId === nameCol);
      const name = String(cell?.displayValue ?? cell?.value ?? "").trim();
      if (name && !nameToRow.has(name) && childrenOf.has(row.id)) {
        nameToRow.set(name, row);
      }
    }

    const updates: Array<{ id: number; cells: Array<{ columnId: number; value: string }> }> = [];

    for (const rule of SECTION_DATE_RULES) {
      const sectionRow = nameToRow.get(rule.sectionName);
      if (!sectionRow) continue;

      if (rule.firstLeafStartOffset !== undefined) {
        const leaf = firstLeaf(sectionRow.id);
        if (leaf) {
          updates.push({
            id: leaf.id,
            cells: [{ columnId: startCol, value: addMonths(startDate, rule.firstLeafStartOffset) }],
          });
        }
      }

      if (rule.lastLeafStartOffset !== undefined) {
        const leaf = lastLeaf(sectionRow.id);
        if (leaf) {
          updates.push({
            id: leaf.id,
            cells: [{ columnId: startCol, value: addMonths(startDate, rule.lastLeafStartOffset) }],
          });
        }
      }
    }

    if (updates.length > 0) {
      await updateRows(sheetId, updates);
    }
  } catch (e) {
    console.error("Failed to seed default dates on Project Plan:", e);
  }
}

// ---------------------------------------------------------------------------
// Populate Document Repository sheet with links to copied sheets
// ---------------------------------------------------------------------------

async function populateDocumentRepositoryLinks(
  copiedSheets: Map<string, { id: number; permalink?: string }>,
) {
  // Find the Document Repository sheet among copied sheets
  const docRepo = copiedSheets.get("Document Repository");
  if (!docRepo) return;

  try {
    const sheet = await getSheet(String(docRepo.id));
    const cols = columnIdMap(sheet);
    const nameColId = cols.get("Document Name");
    const linkColId = cols.get("Link");
    if (!nameColId || !linkColId) return;

    const updates: Array<{ id: number; cells: Array<{ columnId: number; value?: string; hyperlink?: { url: string } }> }> = [];

    for (const row of sheet.rows) {
      const nameCell = row.cells.find((c) => c.columnId === nameColId);
      const docName = String(nameCell?.value ?? "").trim();
      if (!docName) continue;

      const match = copiedSheets.get(docName);
      if (!match?.permalink) continue;

      updates.push({
        id: row.id,
        cells: [{
          columnId: linkColId,
          value: match.permalink,
          hyperlink: { url: match.permalink },
        }],
      });
    }

    if (updates.length > 0) {
      await updateRows(String(docRepo.id), updates);
    }
  } catch (e) {
    console.error("Failed to populate Document Repository links:", e);
  }
}

// ---------------------------------------------------------------------------
// Provision: copy template sheets into a customer folder in the sandbox
// ---------------------------------------------------------------------------

async function provisionWorkspace(
  projectId: string,
  project: ProjectConfig,
): Promise<Record<string, string>> {
  const templateWsId = getTemplateWorkspaceId(project.projectTemplate);
  const sandboxWsId = process.env.SMARTSHEET_WORKSPACE_ID;
  if (!templateWsId || !sandboxWsId) return {};

  // Create customer folder in the sandbox workspace
  const customerFolder = await createFolderInWorkspace(sandboxWsId, project.customerName);

  // Read the template workspace structure
  const templateWs = await ssFetch<{
    sheets?: Array<{ id: number; name: string }>;
    folders?: Array<{ id: number; name: string }>;
  }>(`/workspaces/${templateWsId}`);

  const linked: Record<string, string> = {
    customerFolderId: String(customerFolder.id),
  };

  // Track all copied sheets by name for Document Repository linking
  const copiedSheets = new Map<string, { id: number; permalink?: string }>();

  // Copy top-level sheets
  if (templateWs.sheets) {
    for (const sheet of templateWs.sheets) {
      const copied = await copySheetToFolder(sheet.id, customerFolder.id, sheet.name);
      const key = SHEET_NAME_MAP[sheet.name.toLowerCase().trim()];
      if (key) linked[key] = String(copied.id);
      copiedSheets.set(sheet.name, { id: copied.id, permalink: copied.permalink });
    }
  }

  // Copy subfolders and their sheets
  if (templateWs.folders) {
    for (const folder of templateWs.folders) {
      const subFolder = await createFolderInFolder(customerFolder.id, folder.name);
      try {
        const folderContents = await ssFetch<{
          sheets?: Array<{ id: number; name: string }>;
        }>(`/folders/${folder.id}`);
        if (folderContents.sheets) {
          for (const sheet of folderContents.sheets) {
            const copied = await copySheetToFolder(sheet.id, subFolder.id, sheet.name);
            const key = SHEET_NAME_MAP[sheet.name.toLowerCase().trim()];
            if (key) linked[key] = String(copied.id);
            copiedSheets.set(sheet.name, { id: copied.id, permalink: copied.permalink });
          }
        }
      } catch (e) {
        console.error(`Failed to copy folder "${folder.name}":`, e);
      }
    }
  }

  // Seed Project Info if found
  if (linked.projectInfoSheetId) {
    try {
      await seedProjectInfo(linked.projectInfoSheetId, projectId, project);
    } catch (e) {
      console.error("Failed to seed Project Info sheet:", e);
    }
  }

  // Seed default dates on the Project Plan
  if (linked.projectPlanSheetId && project.startDate) {
    await seedDefaultDates(linked.projectPlanSheetId, project.startDate);
  }

  // Populate Document Repository links
  if (copiedSheets.size > 0) {
    await populateDocumentRepositoryLinks(copiedSheets);
  }

  // Auto-populate metrics from source sheets
  if (linked.metricsSheetId) {
    try {
      const { refreshMetrics } = await import("./metrics-compute");
      await refreshMetrics(linked as unknown as import("@/types/models").SmartsheetConfig);
    } catch (e) {
      console.error("Failed to seed metrics during provisioning:", e);
    }
  }

  // Create SharePoint customer folder (if configured)
  try {
    const { isSharePointConfigured, createCustomerFolder } = await import("./sharepoint");
    if (isSharePointConfigured()) {
      const spResult = await createCustomerFolder(project.customerName);
      linked.sharepointFolderUrl = spResult.folderUrl;
      linked.sharepointFolderId = spResult.folderId;
    }
  } catch (e) {
    console.error("Failed to create SharePoint folder:", e);
  }

  return linked;
}

// ---------------------------------------------------------------------------
// Discover sheets in a workspace (for manual link-sheets fallback)
// ---------------------------------------------------------------------------

async function discoverSheets(workspaceId: string): Promise<Record<string, string>> {
  const wsContents = await ssFetch<{
    sheets?: Array<{ id: number; name: string }>;
    folders?: Array<{ id: number; name: string }>;
  }>(`/workspaces/${workspaceId}`);

  const linked: Record<string, string> = {};

  if (wsContents.sheets) {
    for (const sheet of wsContents.sheets) {
      const key = SHEET_NAME_MAP[sheet.name.toLowerCase().trim()];
      if (key) linked[key] = String(sheet.id);
    }
  }

  if (wsContents.folders) {
    for (const folder of wsContents.folders) {
      try {
        const folderContents = await ssFetch<{
          sheets?: Array<{ id: number; name: string }>;
        }>(`/folders/${folder.id}`);
        if (folderContents.sheets) {
          for (const sheet of folderContents.sheets) {
            const key = SHEET_NAME_MAP[sheet.name.toLowerCase().trim()];
            if (key) linked[key] = String(sheet.id);
          }
        }
      } catch {
        // folder might not be accessible
      }
    }
  }

  return linked;
}

// ---------------------------------------------------------------------------
// Link Smartsheet sheets (manual fallback for existing workspaces)
// ---------------------------------------------------------------------------

const SHEET_NAME_MAP: Record<string, string> = {
  "project plan template": "projectPlanSheetId",
  "raid log": "raidLogSheetId",
  "document hub": "documentSheetId",
  "document repository": "documentSheetId",
  "integration tracker": "integrationTrackerSheetId",
  "meeting tracker": "meetingTrackerSheetId",
  "project info": "projectInfoSheetId",
  "metrics": "metricsSheetId",
};

export interface LinkResult {
  linked: Record<string, string>;
  seededProjectInfo: boolean;
  workspaceId: string;
  workspaceName: string;
}

async function seedProjectInfo(
  sheetId: string,
  projectId: string,
  project: ProjectConfig,
) {
  const sheet = await ssFetch<{
    columns: Array<{ id: number; title: string; primary?: boolean }>;
    rows: Array<{ id: number }>;
  }>(`/sheets/${sheetId}`);

  const fieldCol = sheet.columns.find((c) => c.primary);
  const valueCol = sheet.columns.find((c) =>
    c.title.toLowerCase() === "value" && !c.primary,
  );
  if (!fieldCol || !valueCol) return false;

  const appUrl = process.env.APP_URL || process.env.NEXTAUTH_URL || "http://localhost:3000";
  const portalUrl = `${appUrl}/hub/login?project=${projectId}`;

  const rows: Array<{ field: string; value: string }> = [
    { field: "Customer Portal URL", value: portalUrl },
    { field: "Customer Portal Password", value: project.password },
    { field: "Customer Name", value: project.customerName },
    { field: "Institution Legal Name", value: project.institutionLegalName || "" },
    { field: "Institution Type", value: project.institutionType || "" },
    { field: "Project Name", value: project.projectName },
    { field: "Customer Project Lead", value: project.customerProjectLead || "" },
    { field: "Primary Mailing Address", value: project.primaryMailingAddress || "" },
    { field: "ERP/Financial System", value: project.erpSystem || "" },
    { field: "ERP Version", value: project.erpVersion || "" },
    { field: "ERP Hosting", value: project.erpHosting || "" },
    { field: "SC Name", value: project.scName },
    { field: "Modules in Scope", value: project.products.join("; ") },
    { field: "Project Template", value: project.projectTemplate || "" },
    { field: "Target Go-Live", value: project.goLiveDate || "" },
    { field: "Initial Draft Due", value: project.dateDueInitialDraft || "" },
    { field: "HubSpot Record ID", value: project.hubspotIntakeId },
  ].filter((r) => r.value);

  const ssRows = rows.map((r) => {
    const valueCell: { columnId: number; value: string; hyperlink?: { url: string } } = {
      columnId: valueCol.id,
      value: r.value,
    };
    if (r.field === "Customer Portal URL") {
      valueCell.hyperlink = { url: r.value };
    }
    return {
      cells: [
        { columnId: fieldCol.id, value: r.field },
        valueCell,
      ],
    };
  });

  if (ssRows.length > 0) {
    await addRows(sheetId, ssRows);
  }

  return true;
}

export async function linkSmartsheetSheets(projectId: string): Promise<LinkResult> {
  const projects = await readProjects();
  const project = projects[projectId];
  if (!project) throw new Error(`Project "${projectId}" not found`);

  // List all workspaces to find the customer's
  const wsData = await ssFetch<{ data: Array<{ id: number; name: string }> }>("/workspaces");
  const customerName = project.customerName.toLowerCase().trim();

  const workspace = wsData.data.find((ws) =>
    ws.name.toLowerCase().includes(customerName),
  );
  if (!workspace) {
    throw new Error(
      `No Smartsheet workspace found matching "${project.customerName}". ` +
      `Make sure the project has been activated in the portfolio first.`,
    );
  }

  const linked = await discoverSheets(String(workspace.id));
  linked.workspaceId = String(workspace.id);

  let seededProjectInfo = false;
  if (linked.projectInfoSheetId) {
    try {
      seededProjectInfo = await seedProjectInfo(
        linked.projectInfoSheetId,
        projectId,
        project,
      ) ?? false;
    } catch (e) {
      console.error("Failed to seed Project Info sheet:", e);
    }
  }

  project.smartsheetConfig = { ...project.smartsheetConfig, ...linked };
  await writeProjects(projects);

  // Auto-populate metrics from source sheets
  if (linked.metricsSheetId) {
    try {
      const { refreshMetrics } = await import("./metrics-compute");
      const ssConfig = project.smartsheetConfig as import("@/types/models").SmartsheetConfig;
      await refreshMetrics(ssConfig);
    } catch (e) {
      console.error("Failed to seed metrics sheet:", e);
    }
  }

  // Create SharePoint customer folder (if configured and not already created)
  if (!project.sharepointFolderUrl) {
    try {
      const { isSharePointConfigured, createCustomerFolder } = await import("./sharepoint");
      if (isSharePointConfigured()) {
        const spResult = await createCustomerFolder(project.customerName);
        project.sharepointFolderUrl = spResult.folderUrl;
        project.sharepointFolderId = spResult.folderId;
        await writeProjects(projects);
      }
    } catch (e) {
      console.error("Failed to create SharePoint folder:", e);
    }
  }

  return {
    linked,
    seededProjectInfo,
    workspaceId: String(workspace.id),
    workspaceName: workspace.name,
  };
}

// ---------------------------------------------------------------------------
// Main provisioning functions
// ---------------------------------------------------------------------------

function buildProjectConfig(
  record: HubSpotRecord,
  data: ReturnType<typeof extractProjectData>,
): ProjectConfig {
  return {
    customerName: data.customerName,
    projectName: data.projectName,
    products: data.products,
    scName: data.scName,
    scEmail: "",
    startDate: new Date().toISOString().slice(0, 10),
    goLiveDate: data.goLiveDate,
    currentPhase: "intake",
    status: "ON_TRACK",
    branding: { accentColor: "#1E3A5F" },
    hubspotIntakeId: record.id,
    smartsheetConfig: {},
    sectionVisibility: {},
    password: generatePassword(data.customerName),
    institutionLegalName: data.institutionLegalName,
    institutionType: data.institutionType,
    customerProjectLead: data.customerProjectLead,
    primaryMailingAddress: data.primaryMailingAddress,
    erpSystem: data.erpSystem,
    erpVersion: data.erpVersion,
    erpHosting: data.erpHosting,
    projectTemplate: data.projectTemplate,
    dateDueInitialDraft: data.dateDueInitialDraft,
  };
}

export async function syncFromHubSpot(): Promise<ProvisionResult> {
  const records = await listIntakeRecords();
  const projects = await readProjects();

  const existingHubspotIds = new Set(
    Object.values(projects).map((p) => p.hubspotIntakeId).filter(Boolean),
  );

  const result: ProvisionResult = { created: [], skipped: 0 };

  for (const record of records) {
    const createHub = record.properties.create_customer_hub;
    const isYes = createHub === "true" || createHub?.toLowerCase() === "yes";
    if (!isYes) {
      result.skipped++;
      continue;
    }

    if (existingHubspotIds.has(record.id)) {
      result.skipped++;
      continue;
    }

    const data = extractProjectData(record);
    const projectId = pickProjectId(slugify(data.customerName), projects);

    const config = buildProjectConfig(record, data);

    try {
      const linked = await provisionWorkspace(projectId, config);
      if (Object.keys(linked).length > 0) {
        config.smartsheetConfig = linked;
      }
    } catch (e) {
      console.error(`Failed to provision workspace for ${data.customerName}:`, e);
    }

    projects[projectId] = config;
    existingHubspotIds.add(record.id);

    result.created.push({
      projectId,
      customerName: data.customerName,
      hubspotRecordId: record.id,
    });
  }

  if (result.created.length > 0) {
    await writeProjects(projects);
  }

  return result;
}

export async function provisionFromHubSpotRecord(recordId: string): Promise<ProvisionResult> {
  const { getIntakeRecord } = await import("./hubspot");
  const record = await getIntakeRecord(recordId);
  const projects = await readProjects();

  const existingHubspotIds = new Set(
    Object.values(projects).map((p) => p.hubspotIntakeId).filter(Boolean),
  );

  if (existingHubspotIds.has(record.id)) {
    return { created: [], skipped: 1 };
  }

  const createHub = record.properties.create_customer_hub;
  const isYes = createHub === "true" || createHub?.toLowerCase() === "yes";
  if (!isYes) {
    return { created: [], skipped: 1 };
  }

  const data = extractProjectData(record);
  const projectId = pickProjectId(slugify(data.customerName), projects);

  const config = buildProjectConfig(record, data);

  try {
    const linked = await provisionWorkspace(projectId, config);
    if (Object.keys(linked).length > 0) {
      config.smartsheetConfig = linked;
    }
  } catch (e) {
    console.error(`Failed to provision workspace for ${data.customerName}:`, e);
  }

  projects[projectId] = config;
  await writeProjects(projects);

  return {
    created: [{ projectId, customerName: data.customerName, hubspotRecordId: record.id }],
    skipped: 0,
  };
}
