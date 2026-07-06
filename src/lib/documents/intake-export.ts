import {
  AlignmentType,
  BorderStyle,
  Document,
  Footer,
  Header,
  HeadingLevel,
  PageBreak,
  PageNumber,
  Packer,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from "docx";
interface IntakeSection {
  sectionKey: string;
  status: string;
  formData: Record<string, unknown> | unknown;
}

interface CustomerUpload {
  fileName: string;
  sizeBytes: number;
  sectionKey?: string;
  createdAt: Date | string;
}
import {
  PART_FOR_SECTION,
  PART_LABELS,
  RESPONSIBILITIES_DEFAULT,
  SECTION_LABELS,
  SECTION_ORDER,
  SIGNOFF_ROLES,
  WORKSHOP_SECTIONS,
  type CatalogLandscapeData,
  type CommunicationData,
  type CustomerProfileData,
  type EsmTestingAccessData,
  type InstitutionalProfileData,
  type PoProcessData,
  type PowerUsersData,
  type ProcurementGuidelinesData,
  type ProjectTeamData,
  type ReceivingProcessData,
  type ResponsibilitiesData,
  type SignoffData,
  type SsoInfoData,
  type SuccessCriteriaData,
  type TransactionPreferencesData,
  type WorkshopAck,
} from "@/types";

const PAGE_WIDTH = 12240;
const MARGIN = 1440;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;
const ESM_BLUE = "1F4E79";
const ESM_GREY = "595959";
const BORDER_GREY = "BFBFBF";

const border = { style: BorderStyle.SINGLE, size: 4, color: BORDER_GREY };
const cellBorders = { top: border, bottom: border, left: border, right: border };
const cellMargins = { top: 80, bottom: 80, left: 120, right: 120 };

function plain(text: string, opts: { bold?: boolean; size?: number; color?: string } = {}): Paragraph {
  return new Paragraph({
    children: [new TextRun({ text, bold: opts.bold, size: opts.size, color: opts.color, font: "Arial" })],
    spacing: { after: 80 },
  });
}

function emptyDash(v: string | undefined | null): string {
  if (!v) return "—";
  const t = String(v).trim();
  return t.length > 0 ? t : "—";
}

function fmtDate(d: Date | null | undefined): string {
  if (!d) return "—";
  return d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

function maskKey(s: string | undefined): string {
  if (!s) return "—";
  return s.length > 4 ? `••••${s.slice(-4)}` : s;
}

function partHeading(label: string): Paragraph {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 360, after: 120 },
    children: [new TextRun({ text: label, bold: true, size: 32, color: ESM_BLUE, font: "Arial" })],
  });
}

function sectionHeading(label: string, statusText: string): Paragraph {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 240, after: 60 },
    children: [
      new TextRun({ text: label, bold: true, size: 26, color: ESM_BLUE, font: "Arial" }),
      new TextRun({ text: `   [${statusText}]`, size: 18, color: ESM_GREY, font: "Arial" }),
    ],
  });
}

function statusLabel(status: string): string {
  switch (status) {
    case "COMPLETE": return "Complete";
    case "IN_PROGRESS": return "In progress";
    case "IN_WORKSHOP": return "In workshop";
    default: return "Not started";
  }
}

function textCell(text: string, opts: { width: number; bold?: boolean; shade?: string } = { width: CONTENT_WIDTH / 2 }): TableCell {
  return new TableCell({
    width: { size: opts.width, type: WidthType.DXA },
    borders: cellBorders,
    margins: cellMargins,
    shading: opts.shade ? { fill: opts.shade, type: ShadingType.CLEAR } : undefined,
    children: [
      new Paragraph({
        children: [new TextRun({ text, bold: opts.bold, size: 20, font: "Arial", color: opts.shade ? "FFFFFF" : undefined })],
      }),
    ],
  });
}

function twoColTable(rows: Array<[string, string]>, opts: { labelWidth?: number } = {}): Table {
  const labelWidth = opts.labelWidth ?? Math.floor(CONTENT_WIDTH * 0.4);
  const valueWidth = CONTENT_WIDTH - labelWidth;
  return new Table({
    width: { size: CONTENT_WIDTH, type: WidthType.DXA },
    columnWidths: [labelWidth, valueWidth],
    rows: rows.map(
      ([label, value]) =>
        new TableRow({
          children: [textCell(label, { width: labelWidth, bold: true }), textCell(emptyDash(value), { width: valueWidth })],
        }),
    ),
  });
}

function gridTable(headers: string[], rows: string[][]): Table {
  const colCount = headers.length;
  const colWidth = Math.floor(CONTENT_WIDTH / colCount);
  const columnWidths = headers.map((_, i) => (i === colCount - 1 ? CONTENT_WIDTH - colWidth * (colCount - 1) : colWidth));
  return new Table({
    width: { size: CONTENT_WIDTH, type: WidthType.DXA },
    columnWidths,
    rows: [
      new TableRow({
        tableHeader: true,
        children: headers.map((h, i) => textCell(h, { width: columnWidths[i], bold: true, shade: ESM_BLUE })),
      }),
      ...rows.map(
        (row) =>
          new TableRow({
            children: row.map((c, i) => textCell(emptyDash(c), { width: columnWidths[i] })),
          }),
      ),
    ],
  });
}

function emptyParagraph(): Paragraph {
  return new Paragraph({ children: [new TextRun({ text: "—", italics: true, color: "999999", size: 20, font: "Arial" })] });
}

// ---------------------------------------------------------------------------
// Section body renderers
// ---------------------------------------------------------------------------

type SectionData = Record<string, unknown>;

function renderSectionBody(key: keyof typeof SECTION_LABELS, data: SectionData): Array<Paragraph | Table> {
  if (WORKSHOP_SECTIONS.has(key as never)) {
    return renderWorkshop(data as WorkshopAck);
  }
  switch (key) {
    case "CUSTOMER_PROFILE": return renderCustomerProfile(data as CustomerProfileData);
    case "SUCCESS_CRITERIA": return renderSuccessCriteria(data as SuccessCriteriaData);
    case "PROJECT_TEAM": return renderProjectTeam(data as unknown as ProjectTeamData);
    case "COMMUNICATION": return renderCommunication(data as CommunicationData);
    case "RESPONSIBILITIES": return renderResponsibilities(data as unknown as ResponsibilitiesData);
    case "INSTITUTIONAL_PROFILE": return renderInstitutionalProfile(data as InstitutionalProfileData);
    case "PROCUREMENT_GUIDELINES": return renderProcurement(data as unknown as ProcurementGuidelinesData);
    case "CATALOG_LANDSCAPE": return renderCatalog(data as unknown as CatalogLandscapeData);
    case "PO_PROCESS": return renderPoProcess(data as PoProcessData);
    case "RECEIVING_PROCESS": return renderReceiving(data as ReceivingProcessData);
    case "POWER_USERS": return renderPowerUsers(data as unknown as PowerUsersData);
    case "SSO_INFO": return renderSsoInfo(data as SsoInfoData);
    case "ESM_TESTING_ACCESS": return renderEsmAccess(data as EsmTestingAccessData);
    case "TRANSACTION_PREFERENCES": return renderTxnPrefs(data as unknown as TransactionPreferencesData);
    case "SIGNOFF": return renderSignoff(data as unknown as SignoffData);
    default: return [emptyParagraph()];
  }
}

function renderWorkshop(d: WorkshopAck): Array<Paragraph | Table> {
  return [
    new Paragraph({
      children: [
        new TextRun({ text: "Workshop Section. ", bold: true, italics: true, color: ESM_BLUE, size: 20, font: "Arial" }),
        new TextRun({ text: "To be completed in a workshop with the ESM Solution Consultant.", italics: true, color: ESM_GREY, size: 20, font: "Arial" }),
      ],
    }),
    twoColTable([
      ["Customer acknowledgment", d.acknowledged ? "Acknowledged" : "Not yet acknowledged"],
      ["Pre-workshop notes from customer", d.customerNotes ?? ""],
    ]),
  ];
}

function renderCustomerProfile(d: CustomerProfileData): Array<Paragraph | Table> {
  return [twoColTable([
    ["Institution legal name", d.institutionLegalName ?? ""],
    ["Institution type", d.institutionType ?? ""],
    ["Primary mailing address", d.primaryMailingAddress ?? ""],
    ["ERP / Financial System (product + version)", d.erpProductVersion ?? ""],
    ["ERP hosting", d.erpHosting ?? ""],
    ["ESM modules in scope", d.esmModulesInScope ?? ""],
  ])];
}

function renderSuccessCriteria(d: SuccessCriteriaData): Array<Paragraph | Table> {
  return [
    plain("Success outcomes:", { bold: true }),
    new Paragraph({ children: [new TextRun({ text: emptyDash(d.outcomes), size: 20, font: "Arial" })], spacing: { after: 120 } }),
    twoColTable([["ESM standard definition of done accepted", d.dodAccepted ? "Yes" : "No"]]),
  ];
}

function renderProjectTeam(d: ProjectTeamData): Array<Paragraph | Table> {
  const customer = (d.customerTeam ?? []).map((m) => [m.name ?? "", m.title ?? "", m.projectRole ?? "", m.email ?? "", m.phone ?? ""]);
  const partner = (d.erpPartnerTeam ?? []).map((m) => [m.name ?? "", m.title ?? "", m.projectRole ?? "", m.email ?? "", m.phone ?? ""]);
  const blocks: Array<Paragraph | Table> = [];
  blocks.push(plain("Customer team:", { bold: true }));
  blocks.push(customer.length > 0 ? gridTable(["Name", "Title", "Project Role", "Email", "Phone"], customer) : emptyParagraph());
  blocks.push(plain("ERP partner team:", { bold: true }));
  blocks.push(partner.length > 0 ? gridTable(["Name", "Title", "Project Role", "Email", "Phone"], partner) : emptyParagraph());
  return blocks;
}

function renderCommunication(d: CommunicationData): Array<Paragraph | Table> {
  return [
    gridTable(
      ["Meeting", "ESM Default", "Customer Confirmation"],
      [
        ["Implementation status meeting", "Weekly, 60–90 min", d.statusCadenceConfirmed ?? ""],
        ["Project steering committee", "Bi-weekly", d.steeringCadenceConfirmed ?? ""],
        ["Workstream sessions", "Ad-hoc as needed", d.workstreamCadenceConfirmed ?? ""],
      ],
    ),
    twoColTable([
      ["Customer time zone", d.customerTimeZone ?? ""],
      ["Preferred meeting platform", d.preferredMeetingPlatform ?? ""],
      ["Blackout periods", d.blackoutPeriods ?? ""],
    ]),
  ];
}

function renderResponsibilities(d: ResponsibilitiesData): Array<Paragraph | Table> {
  const assignments = d.assignments ?? RESPONSIBILITIES_DEFAULT;
  return [gridTable(["Responsibility", "Owner", "Notes"], assignments.map((a) => [a.responsibility, a.owner ?? "", a.notes ?? ""]))];
}

function renderInstitutionalProfile(d: InstitutionalProfileData): Array<Paragraph | Table> {
  return [twoColTable([
    ["Institution type", d.institutionType ?? ""],
    ["Governing authority / oversight bodies", d.governingAuthority ?? ""],
    ["Procurement model", d.procurementModel ?? ""],
    ["Number of campuses / major locations", d.campusCount ?? ""],
  ])];
}

function renderProcurement(d: ProcurementGuidelinesData): Array<Paragraph | Table> {
  const blocks: Array<Paragraph | Table> = [];
  blocks.push(plain("Spend threshold tiers:", { bold: true }));
  blocks.push(
    (d.spendTiers ?? []).length > 0
      ? gridTable(["Spend range", "Requirement", "Applies to"], (d.spendTiers ?? []).map((t) => [t.spendRange ?? "", t.requirement ?? "", t.appliesTo ?? ""]))
      : emptyParagraph(),
  );
  blocks.push(twoColTable([
    ["Tax status", d.taxStatus ?? ""],
    ["Standard payment terms", d.paymentTerms ?? ""],
    ["Other procurement rules", d.otherRules ?? ""],
    ["Policy document attached", d.policyAttached ? "Yes (see uploads)" : "No"],
  ]));
  return blocks;
}

function renderCatalog(d: CatalogLandscapeData): Array<Paragraph | Table> {
  const blocks: Array<Paragraph | Table> = [];
  const suppliers = (d.suppliers ?? []).filter((s) => (s.supplier ?? "").trim().length > 0);
  blocks.push(plain("Catalog suppliers (Phase 1):", { bold: true }));
  blocks.push(
    suppliers.length > 0
      ? gridTable(["Supplier", "Priority Tier"], suppliers.map((s) => [s.supplier ?? "", s.tier ?? ""]))
      : emptyParagraph(),
  );
  blocks.push(twoColTable([
    ["Existing contracts / state pricing", d.existingContracts ?? ""],
    ["Non-catalog ordering policy", d.nonCatalogAllowed ?? ""],
  ]));
  return blocks;
}

function renderPoProcess(d: PoProcessData): Array<Paragraph | Table> {
  return [twoColTable([
    ["Standard PO terms and conditions", d.standardTerms ?? ""],
    ["PO distribution method", d.distributionMethod ?? ""],
    ["Who can request PO changes after dispatch", d.whoCanRequestChanges ?? ""],
    ["Do PO changes require re-approval", d.changesRequireReapproval ?? ""],
    ["Sample PO attached", d.samplePoAttached ? "Yes (see uploads)" : "No"],
  ])];
}

function renderReceiving(d: ReceivingProcessData): Array<Paragraph | Table> {
  return [twoColTable([
    ["Receiving model", d.receivingModel ?? ""],
    ["Central receiving address", d.centralReceivingAddress ?? ""],
    ["Who performs receiving", d.whoPerforms ?? ""],
    ["Quantity-based / value-based / both", d.quantityValueOrBoth ?? ""],
    ["Partial receipts allowed", d.partialReceiptsAllowed ?? ""],
    ["Over-receipts allowed (tolerance)", d.overReceiptsAllowed ?? ""],
    ["Service receiving model", d.serviceReceivingModel ?? ""],
  ])];
}

function renderPowerUsers(d: PowerUsersData): Array<Paragraph | Table> {
  const users = (d.users ?? []).filter((u) => (u.name ?? "").trim().length > 0);
  if (users.length === 0) return [emptyParagraph()];
  return [gridTable(["Name", "Department", "Role", "Training Date"], users.map((u) => [u.name ?? "", u.department ?? "", u.role ?? "", u.trainingDate ?? ""]))];
}

function renderSsoInfo(d: SsoInfoData): Array<Paragraph | Table> {
  return [twoColTable([
    ["SSO type", d.ssoType ?? ""],
    ["IdP product name and version", d.idpProductVersion ?? ""],
    ["IdP administrator", [d.idpAdminName, d.idpAdminEmail, d.idpAdminPhone].filter(Boolean).join(" · ")],
    ["MFA enforced at IdP", d.mfaEnforced ?? ""],
    ["User provisioning approach", d.provisioningApproach ?? ""],
    ["SSO metadata — Training (URL)", d.trainingMetadataUrl ?? ""],
    ["SSO metadata — Training (file uploaded)", d.trainingMetadataUploaded ? "Yes" : "No"],
    ["SSO metadata — Production (URL)", d.productionMetadataUrl ?? ""],
    ["SSO metadata — Production (file uploaded)", d.productionMetadataUploaded ? "Yes" : "No"],
    ["ESM SSO accounts acknowledged", d.esmAccountsAcknowledged ? "Yes" : "No"],
  ])];
}

function renderEsmAccess(d: EsmTestingAccessData): Array<Paragraph | Table> {
  return [
    twoColTable([
      ["API key — Training", maskKey(d.apiKeyTraining)],
      ["API key — Production", maskKey(d.apiKeyProduction)],
      ["Banner Tenet ID — Training", d.bannerTenetTraining ?? ""],
      ["Banner Tenet ID — Production", d.bannerTenetProduction ?? ""],
      ["ESM purchasing-system accounts acknowledged", d.esmAccountsAcknowledged ? "Yes" : "No"],
    ]),
    plain("API keys are masked in this export. Contact the project SC for the full values stored in Smartsheet.", { size: 16, color: ESM_GREY }),
  ];
}

function renderTxnPrefs(d: TransactionPreferencesData): Array<Paragraph | Table> {
  const copyRows = (d.copy ?? []).map((r) => [r.field, r.allow ?? "", r.notes ?? ""]);
  const changeRows = (d.change ?? []).map((r) => [r.field, r.allow ?? "", r.notes ?? ""]);
  return [
    plain("Transaction copy — fields that carry over when a user copies a transaction:", { bold: true }),
    copyRows.length > 0 ? gridTable(["Field", "Allow Copy?", "Notes"], copyRows) : emptyParagraph(),
    plain("Change order — fields a user may modify on an existing PO:", { bold: true }),
    changeRows.length > 0 ? gridTable(["Field", "Allow Change?", "Notes"], changeRows) : emptyParagraph(),
  ];
}

function renderSignoff(d: SignoffData): Array<Paragraph | Table> {
  const rows = d.rows ?? SIGNOFF_ROLES.map((role) => ({ role, name: "", date: "", confirmed: false }));
  return [gridTable(["Role", "Name", "Date", "Confirmed"], rows.map((r) => [r.role, r.name ?? "", r.date ?? "", r.confirmed ? "Yes" : "No"]))];
}

// ---------------------------------------------------------------------------
// Public entry point
// ---------------------------------------------------------------------------

export interface ExportInput {
  project: {
    customerName: string;
    projectName: string;
    startDate: Date | null;
    goLiveDate: Date | null;
    intakeCompletePercent: number;
    smartsheetSubmitted: boolean;
    smartsheetSubmittedAt: Date | null;
    sc: { name: string };
    pm: { name: string } | null;
  };
  sections: IntakeSection[];
  uploads: CustomerUpload[];
}

export async function generateIntakeDocx({ project, sections, uploads }: ExportInput): Promise<Buffer> {
  const sectionMap = new Map(sections.map((s) => [s.sectionKey, s]));
  const uploadMap = new Map<string, CustomerUpload[]>();
  for (const u of uploads) {
    if (!u.sectionKey) continue;
    const arr = uploadMap.get(u.sectionKey) ?? [];
    arr.push(u);
    uploadMap.set(u.sectionKey, arr);
  }

  const today = new Date();
  const children: Array<Paragraph | Table> = [];

  children.push(
    new Paragraph({
      alignment: AlignmentType.LEFT,
      spacing: { after: 120 },
      children: [new TextRun({ text: "Customer Intake", bold: true, size: 56, color: ESM_BLUE, font: "Arial" })],
    }),
    new Paragraph({
      spacing: { after: 80 },
      children: [new TextRun({ text: "ESM Implementation", size: 32, color: ESM_GREY, font: "Arial" })],
    }),
    new Paragraph({
      spacing: { after: 360 },
      children: [new TextRun({ text: `Prepared by ESM Solutions   •   ${fmtDate(today)}   •   CONFIDENTIAL`, size: 18, color: ESM_GREY, font: "Arial" })],
    }),
  );

  children.push(plain("Project Information", { bold: true, size: 28, color: ESM_BLUE }));
  children.push(
    twoColTable([
      ["Customer", project.customerName],
      ["Project name", project.projectName],
      ["ESM Solution Consultant", project.sc.name],
      ["ESM Project Manager", project.pm?.name ?? "—"],
      ["Start date", fmtDate(project.startDate)],
      ["Target Go-Live", fmtDate(project.goLiveDate)],
      ["Intake completion", `${project.intakeCompletePercent}%`],
      ["Smartsheet submitted", project.smartsheetSubmitted ? `Yes — ${fmtDate(project.smartsheetSubmittedAt)}` : "No"],
      ["Generated", fmtDate(today)],
    ]),
  );
  children.push(new Paragraph({ children: [new PageBreak()] }));

  for (const part of [1, 2, 3, 4] as const) {
    children.push(partHeading(PART_LABELS[part]));
    const keysInPart = SECTION_ORDER.filter((k) => PART_FOR_SECTION[k] === part);
    for (const key of keysInPart) {
      const sec = sectionMap.get(key);
      const status = sec?.status ?? "NOT_STARTED";
      children.push(sectionHeading(SECTION_LABELS[key], statusLabel(status)));
      const body = renderSectionBody(key, (sec?.formData ?? {}) as SectionData);
      children.push(...body);

      const sectionUploads = uploadMap.get(key) ?? [];
      if (sectionUploads.length > 0) {
        children.push(plain("Uploads:", { bold: true, size: 20 }));
        for (const u of sectionUploads) {
          children.push(plain(`  • ${u.fileName}`, { size: 18, color: ESM_GREY }));
        }
      }

      children.push(new Paragraph({ children: [new TextRun({ text: "" })] }));
    }
  }

  const doc = new Document({
    styles: {
      default: { document: { run: { font: "Arial", size: 22 } } },
      paragraphStyles: [
        {
          id: "Heading1",
          name: "Heading 1",
          basedOn: "Normal",
          next: "Normal",
          quickFormat: true,
          run: { size: 32, bold: true, color: ESM_BLUE, font: "Arial" },
          paragraph: { spacing: { before: 360, after: 120 }, outlineLevel: 0 },
        },
        {
          id: "Heading2",
          name: "Heading 2",
          basedOn: "Normal",
          next: "Normal",
          quickFormat: true,
          run: { size: 26, bold: true, color: ESM_BLUE, font: "Arial" },
          paragraph: { spacing: { before: 240, after: 80 }, outlineLevel: 1 },
        },
      ],
    },
    sections: [
      {
        properties: {
          page: {
            size: { width: PAGE_WIDTH, height: 15840 },
            margin: { top: MARGIN, right: MARGIN, bottom: MARGIN, left: MARGIN },
          },
        },
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [new TextRun({ text: `${project.customerName} — Customer Intake`, size: 16, color: ESM_GREY, font: "Arial" })],
              }),
            ],
          }),
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({ text: "Page ", size: 16, color: ESM_GREY, font: "Arial" }),
                  new TextRun({ children: [PageNumber.CURRENT], size: 16, color: ESM_GREY, font: "Arial" }),
                  new TextRun({ text: " of ", size: 16, color: ESM_GREY, font: "Arial" }),
                  new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 16, color: ESM_GREY, font: "Arial" }),
                  new TextRun({ text: "   •   CONFIDENTIAL   •   Generated by ESM Customer Hub", size: 16, color: ESM_GREY, font: "Arial" }),
                ],
              }),
            ],
          }),
        },
        children,
      },
    ],
  });

  return await Packer.toBuffer(doc);
}
