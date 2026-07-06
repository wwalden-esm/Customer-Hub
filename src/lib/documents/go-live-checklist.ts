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
} from "docx";
import type { Project } from "@/types/models";
import {
  getSmartsheetConfig,
  getProjectMilestones,
  getProjectActionItems,
  getProjectMetrics,
  getProjectDocuments,
} from "@/lib/smartsheet-data";

const ESM_BLUE = "1F3864";
const GREEN = "2E7D32";
const RED = "C62828";
const AMBER = "F57F17";

interface ChecklistItem {
  label: string;
  status: "complete" | "pending" | "blocked";
  detail?: string;
}

interface ChecklistCategory {
  title: string;
  items: ChecklistItem[];
}

function statusColor(s: string): string {
  if (s === "complete") return GREEN;
  if (s === "blocked") return RED;
  return AMBER;
}

function statusIcon(s: string): string {
  if (s === "complete") return "[DONE]";
  if (s === "blocked") return "[BLOCKED]";
  return "[PENDING]";
}

export async function generateGoLiveChecklist(project: Project): Promise<{ buffer: Buffer; fileName: string }> {
  const config = getSmartsheetConfig(project.id);

  const milestones = config.projectPlanSheetId
    ? await getProjectMilestones(config.projectPlanSheetId)
    : [];

  const actionItems = config.actionItemSheetId
    ? await getProjectActionItems(config.actionItemSheetId)
    : [];

  const metrics = config.metricsSheetId
    ? await getProjectMetrics(config.metricsSheetId)
    : [];

  const documents = config.documentSheetId
    ? await getProjectDocuments(config.documentSheetId)
    : [];

  const categories: ChecklistCategory[] = [];

  categories.push({
    title: "Intake & Configuration",
    items: [
      {
        label: "Customer intake data collected",
        status: "pending",
        detail: "Managed in HubSpot",
      },
    ],
  });

  const upcomingMilestones = milestones.filter((m) => m.status !== "complete");
  const completedMilestones = milestones.filter((m) => m.status === "complete");
  categories.push({
    title: "Project Milestones",
    items: [
      {
        label: "All milestones on track",
        status: upcomingMilestones.every((m) => m.status !== "overdue") ? "complete" : "blocked",
        detail: `${completedMilestones.length}/${milestones.length} completed`,
      },
      ...upcomingMilestones.map((m) => ({
        label: m.name,
        status: (m.status === "overdue" ? "blocked" : "pending") as "blocked" | "pending",
        detail: m.date ? `Due: ${m.date}` : "Date TBD",
      })),
    ],
  });

  const openItems = actionItems.filter((a) => a.status === "open");
  const highPriority = openItems.filter((a) => a.priority === "high");
  categories.push({
    title: "Action Items",
    items: [
      {
        label: "All critical action items closed",
        status: highPriority.length === 0 ? "complete" : "blocked",
        detail: `${openItems.length} open, ${highPriority.length} high priority`,
      },
      ...highPriority.map((a) => ({
        label: a.description.substring(0, 80),
        status: "blocked" as const,
        detail: `Owner: ${a.owner || "Unassigned"}`,
      })),
    ],
  });

  const expectedDocs = ["workflow-xlsx", "workflow-docx", "project-charter", "training-guide"];
  const generatedTypes = new Set(documents.map((d) => d.type));
  categories.push({
    title: "Documentation",
    items: expectedDocs.map((type) => ({
      label: type.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
      status: generatedTypes.has(type) ? ("complete" as const) : ("pending" as const),
    })),
  });

  const uatMetric = metrics.find((m) => m.metricType === "uat");
  const integrationMetric = metrics.find((m) => m.metricType === "integration");
  categories.push({
    title: "Testing & Integration",
    items: [
      {
        label: "UAT testing complete",
        status: uatMetric && uatMetric.current >= uatMetric.total ? "complete" : "pending",
        detail: uatMetric ? `${uatMetric.current}/${uatMetric.total}` : "Not tracked",
      },
      {
        label: "Integration testing complete",
        status: integrationMetric && integrationMetric.current >= integrationMetric.total ? "complete" : "pending",
        detail: integrationMetric ? `${integrationMetric.current}/${integrationMetric.total}` : "Not tracked",
      },
    ],
  });

  const children: Paragraph[] = [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
      children: [new TextRun({ text: "Go-Live Readiness Checklist", bold: true, size: 36, color: ESM_BLUE })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 120 },
      children: [new TextRun({ text: project.customerName, size: 26 })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
      children: [
        new TextRun({
          text: `Generated: ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}`,
          italics: true,
          size: 20,
          color: "666666",
        }),
      ],
    }),
  ];

  const allItems = categories.flatMap((c) => c.items);
  const done = allItems.filter((i) => i.status === "complete").length;
  const blocked = allItems.filter((i) => i.status === "blocked").length;
  const pending = allItems.filter((i) => i.status === "pending").length;

  children.push(
    new Paragraph({
      spacing: { after: 300 },
      children: [
        new TextRun({ text: `Ready: ${done}  `, bold: true, color: GREEN, size: 24 }),
        new TextRun({ text: `Pending: ${pending}  `, bold: true, color: AMBER, size: 24 }),
        new TextRun({ text: `Blocked: ${blocked}`, bold: true, color: RED, size: 24 }),
      ],
    }),
  );

  for (const cat of categories) {
    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        children: [new TextRun({ text: cat.title, bold: true, color: ESM_BLUE })],
      }),
    );

    for (const item of cat.items) {
      const detailText = item.detail ? ` — ${item.detail}` : "";
      children.push(
        new Paragraph({
          spacing: { after: 80 },
          children: [
            new TextRun({ text: `${statusIcon(item.status)} `, bold: true, color: statusColor(item.status), size: 22 }),
            new TextRun({ text: item.label, size: 22 }),
            new TextRun({ text: detailText, size: 20, color: "666666" }),
          ],
        }),
      );
    }

    children.push(new Paragraph({ children: [] }));
  }

  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 400 },
      children: [
        new TextRun({
          text: "Generated by ESM Customer Hub — this checklist reflects project state at time of generation",
          italics: true,
          size: 16,
          color: "999999",
        }),
      ],
    }),
  );

  const doc = new Document({
    sections: [
      {
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                tabStops: [{ type: TabStopType.RIGHT, position: TabStopPosition.MAX }],
                children: [new TextRun({ text: project.customerName, bold: true, color: ESM_BLUE, size: 18 })],
              }),
            ],
          }),
        },
        children,
      },
    ],
  });

  const buffer = Buffer.from(await Packer.toBuffer(doc));
  const safeName = project.customerName.replace(/[^a-zA-Z0-9]/g, "_");
  return { buffer, fileName: `GoLive_Checklist_${safeName}.docx` };
}
