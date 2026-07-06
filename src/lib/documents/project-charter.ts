import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  Header,
  TabStopType,
  TabStopPosition,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
} from "docx";
import type { Project } from "@/types/models";
import { generateDocument } from "@/lib/claude";
import {
  getSmartsheetConfig,
  getProjectMilestones,
} from "@/lib/smartsheet-data";

const ESM_BLUE = "1F3864";

interface CharterSection {
  title: string;
  content: string;
  bullets?: string[];
}

interface CharterData {
  executive_summary: string;
  project_scope: CharterSection;
  timeline_and_milestones: CharterSection & { milestones: { name: string; date: string; status: string }[] };
  team_and_responsibilities: CharterSection & { members: { name: string; role: string; responsibilities: string }[] };
  success_criteria: CharterSection;
  governance: CharterSection;
  risk_register: CharterSection & { risks: { description: string; impact: string; mitigation: string }[] };
  assumptions_and_constraints: CharterSection;
}

const CHARTER_SYSTEM = `You are a project management document specialist for ESM Solutions, a B2B procurement software company serving higher education institutions. Generate professional project charter / statement of work content based on the provided project data.

RULES:
- Use formal, professional language suitable for institutional stakeholders
- Base ALL content strictly on the provided data — do not invent details
- Where data is incomplete, note "[To be confirmed]" rather than guessing
- Keep sections concise but comprehensive
- Format dates as Month Day, Year`;

function buildCharterPrompt(projectData: Record<string, unknown>): string {
  return `Generate a Project Charter / Statement of Work for the following ESM implementation project. Return ONLY valid JSON matching the schema below.

PROJECT DATA:
${JSON.stringify(projectData, null, 2)}

Return JSON:
\`\`\`json
{
  "executive_summary": "2-3 paragraph overview",
  "project_scope": { "title": "Project Scope", "content": "paragraph", "bullets": ["scope item 1", ...] },
  "timeline_and_milestones": { "title": "Timeline & Milestones", "content": "paragraph", "milestones": [{"name": "", "date": "", "status": ""}] },
  "team_and_responsibilities": { "title": "Team & Responsibilities", "content": "paragraph", "members": [{"name": "", "role": "", "responsibilities": ""}] },
  "success_criteria": { "title": "Success Criteria", "content": "paragraph", "bullets": ["criterion 1", ...] },
  "governance": { "title": "Governance", "content": "paragraph", "bullets": ["governance item", ...] },
  "risk_register": { "title": "Risk Register", "content": "paragraph", "risks": [{"description": "", "impact": "High/Medium/Low", "mitigation": ""}] },
  "assumptions_and_constraints": { "title": "Assumptions & Constraints", "content": "paragraph", "bullets": ["assumption 1", ...] }
}
\`\`\``;
}

async function collectCharterInputData(project: Project) {
  const config = getSmartsheetConfig(project.id);
  const milestones = config.projectPlanSheetId
    ? await getProjectMilestones(config.projectPlanSheetId)
    : [];

  return {
    customerName: project.customerName,
    projectName: project.projectName,
    products: project.products,
    goLiveDate: project.goLiveDate,
    currentPhase: project.currentPhase,
    sc: project.scName,
    pm: project.pmName || "[Not assigned]",
    milestones: milestones.map((m) => ({
      name: m.name,
      date: m.date || "TBD",
      status: m.status,
    })),
  };
}

function renderCharterToDocx(data: CharterData, customerName: string, projectName: string): Document {
  const cellBorder = {
    top: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
    bottom: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
    left: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
    right: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
  } as const;

  function section(s: CharterSection): Paragraph[] {
    const out: Paragraph[] = [
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        children: [new TextRun({ text: s.title, bold: true, color: ESM_BLUE })],
      }),
      new Paragraph({
        children: [new TextRun({ text: s.content, size: 22 })],
        spacing: { after: 120 },
      }),
    ];
    for (const b of s.bullets || []) {
      out.push(new Paragraph({ bullet: { level: 0 }, children: [new TextRun({ text: b, size: 22 })] }));
    }
    out.push(new Paragraph({ children: [] }));
    return out;
  }

  return new Document({
    sections: [
      {
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                tabStops: [{ type: TabStopType.RIGHT, position: TabStopPosition.MAX }],
                children: [new TextRun({ text: customerName, bold: true, color: ESM_BLUE, size: 18 })],
              }),
            ],
          }),
        },
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 },
            children: [new TextRun({ text: "Project Charter", bold: true, size: 36, color: ESM_BLUE })],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 400 },
            children: [new TextRun({ text: `${customerName} — ${projectName}`, size: 26 })],
          }),

          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            children: [new TextRun({ text: "Executive Summary", bold: true, color: ESM_BLUE })],
          }),
          new Paragraph({
            children: [new TextRun({ text: data.executive_summary, size: 22 })],
            spacing: { after: 200 },
          }),

          ...section(data.project_scope),
          ...section(data.success_criteria),

          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            children: [new TextRun({ text: data.timeline_and_milestones.title, bold: true, color: ESM_BLUE })],
          }),
          new Paragraph({
            children: [new TextRun({ text: data.timeline_and_milestones.content, size: 22 })],
            spacing: { after: 120 },
          }),
          new Table({
            rows: [
              new TableRow({
                children: ["Milestone", "Target Date", "Status"].map(
                  (h) =>
                    new TableCell({
                      borders: cellBorder,
                      width: { size: 3000, type: WidthType.DXA },
                      children: [new Paragraph({ children: [new TextRun({ text: h, bold: true, size: 20 })] })],
                    }),
                ),
              }),
              ...data.timeline_and_milestones.milestones.map(
                (m) =>
                  new TableRow({
                    children: [m.name, m.date, m.status].map(
                      (v) =>
                        new TableCell({
                          borders: cellBorder,
                          width: { size: 3000, type: WidthType.DXA },
                          children: [new Paragraph({ children: [new TextRun({ text: v, size: 20 })] })],
                        }),
                    ),
                  }),
              ),
            ],
          }),
          new Paragraph({ children: [] }),

          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            children: [new TextRun({ text: data.team_and_responsibilities.title, bold: true, color: ESM_BLUE })],
          }),
          new Paragraph({
            children: [new TextRun({ text: data.team_and_responsibilities.content, size: 22 })],
            spacing: { after: 120 },
          }),
          new Table({
            rows: [
              new TableRow({
                children: ["Name", "Role", "Responsibilities"].map(
                  (h) =>
                    new TableCell({
                      borders: cellBorder,
                      width: { size: 3000, type: WidthType.DXA },
                      children: [new Paragraph({ children: [new TextRun({ text: h, bold: true, size: 20 })] })],
                    }),
                ),
              }),
              ...data.team_and_responsibilities.members.map(
                (m) =>
                  new TableRow({
                    children: [m.name, m.role, m.responsibilities].map(
                      (v) =>
                        new TableCell({
                          borders: cellBorder,
                          width: { size: 3000, type: WidthType.DXA },
                          children: [new Paragraph({ children: [new TextRun({ text: v, size: 20 })] })],
                        }),
                    ),
                  }),
              ),
            ],
          }),
          new Paragraph({ children: [] }),

          ...section(data.governance),

          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            children: [new TextRun({ text: data.risk_register.title, bold: true, color: ESM_BLUE })],
          }),
          new Paragraph({
            children: [new TextRun({ text: data.risk_register.content, size: 22 })],
            spacing: { after: 120 },
          }),
          new Table({
            rows: [
              new TableRow({
                children: ["Risk", "Impact", "Mitigation"].map(
                  (h) =>
                    new TableCell({
                      borders: cellBorder,
                      width: { size: 3000, type: WidthType.DXA },
                      children: [new Paragraph({ children: [new TextRun({ text: h, bold: true, size: 20 })] })],
                    }),
                ),
              }),
              ...data.risk_register.risks.map(
                (r) =>
                  new TableRow({
                    children: [r.description, r.impact, r.mitigation].map(
                      (v) =>
                        new TableCell({
                          borders: cellBorder,
                          width: { size: 3000, type: WidthType.DXA },
                          children: [new Paragraph({ children: [new TextRun({ text: v, size: 20 })] })],
                        }),
                    ),
                  }),
              ),
            ],
          }),
          new Paragraph({ children: [] }),

          ...section(data.assumptions_and_constraints),

          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 400 },
            children: [
              new TextRun({
                text: "Generated by ESM Customer Hub — Requires management review before distribution",
                italics: true,
                size: 16,
                color: "999999",
              }),
            ],
          }),
        ],
      },
    ],
  });
}

export async function generateProjectCharter(project: Project): Promise<{ buffer: Buffer; fileName: string }> {
  const inputData = await collectCharterInputData(project);

  const charterData = await generateDocument<CharterData>(
    CHARTER_SYSTEM,
    buildCharterPrompt(inputData),
  );

  const doc = renderCharterToDocx(charterData, inputData.customerName, inputData.projectName);
  const buffer = Buffer.from(await Packer.toBuffer(doc));
  const safeName = inputData.customerName.replace(/[^a-zA-Z0-9]/g, "_");
  return { buffer, fileName: `Project_Charter_${safeName}.docx` };
}
