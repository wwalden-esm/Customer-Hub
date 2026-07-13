import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  PageBreak,
  Header,
  TabStopType,
  TabStopPosition,
} from "docx";
import { WorkflowData } from "./workflow-prompts";

const ESM_BLUE = "1F3864";

function buildCustomerHeader(data: WorkflowData): Paragraph[] {
  const today = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return [
    new Paragraph({
      children: [
        new TextRun({ text: data.customer_name, bold: true, size: 28, color: ESM_BLUE }),
      ],
    }),
    new Paragraph({
      children: [
        new TextRun({ text: `GL System: ${data.gl_system || "N/A"}`, size: 20 }),
      ],
    }),
    new Paragraph({
      children: [
        new TextRun({ text: `Fund Codes: ${data.fund_codes || "N/A"}`, size: 20 }),
      ],
    }),
    new Paragraph({
      children: [
        new TextRun({ text: `Org Codes: ${data.org_codes || "N/A"}`, size: 20 }),
      ],
    }),
    new Paragraph({
      children: [
        new TextRun({ text: `Date: ${today}`, size: 20, italics: true }),
      ],
    }),
    new Paragraph({ children: [] }),
  ];
}

function buildWorkflowAppendix(data: WorkflowData): Paragraph[] {
  const paragraphs: Paragraph[] = [
    new Paragraph({
      children: [new PageBreak()],
    }),
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      children: [
        new TextRun({
          text: `Appendix: Configured Workflow for ${data.customer_name}`,
          bold: true,
          color: ESM_BLUE,
        }),
      ],
    }),
    new Paragraph({ children: [] }),
  ];

  const steps = Object.entries(data.workflow_steps).sort(([a], [b]) => {
    const numA = parseInt(a.replace("step", ""));
    const numB = parseInt(b.replace("step", ""));
    return numA - numB;
  });

  for (const [, step] of steps) {
    if (!step.active || step.rules.length === 0) continue;

    let label = step.label;
    if (step.has_threshold && step.rules[0]?.transaction_total != null) {
      label += ` (>= $${step.rules[0].transaction_total.toLocaleString()})`;
    }

    paragraphs.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        children: [new TextRun({ text: label, bold: true })],
      }),
    );

    for (const rule of step.rules) {
      const parts: string[] = [];
      if (rule.workflow_name) parts.push(rule.workflow_name);
      if (rule.fund_code && rule.fund_code !== "All") parts.push(`Fund: ${rule.fund_code}`);
      if (rule.org_code && rule.org_code !== "All") parts.push(`Org: ${rule.org_code}`);
      if (rule.approver_1_name) parts.push(`Approver: ${rule.approver_1_name}`);
      if (rule.approver_2_name) parts.push(`Approver 2: ${rule.approver_2_name}`);
      if (rule.approver_3_name) parts.push(`Approver 3: ${rule.approver_3_name}`);
      if (rule.notes) parts.push(`Notes: ${rule.notes}`);

      paragraphs.push(
        new Paragraph({
          bullet: { level: 0 },
          children: [new TextRun({ text: parts.join(" | "), size: 20 })],
        }),
      );
    }

    paragraphs.push(new Paragraph({ children: [] }));
  }

  return paragraphs;
}

export async function generateWorkflowDocx(data: WorkflowData): Promise<Buffer> {
  const doc = new Document({
    sections: [
      {
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                tabStops: [{ type: TabStopType.RIGHT, position: TabStopPosition.MAX }],
                children: [
                  new TextRun({
                    text: data.customer_name,
                    bold: true,
                    color: ESM_BLUE,
                    size: 18,
                  }),
                ],
              }),
            ],
          }),
        },
        children: [
          ...buildCustomerHeader(data),

          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            children: [
              new TextRun({
                text: "Workflow Template Guide",
                bold: true,
                color: ESM_BLUE,
              }),
            ],
          }),
          new Paragraph({ children: [] }),

          new Paragraph({
            children: [
              new TextRun({
                text: `This document outlines the configured procurement approval workflows for ${data.customer_name}. `,
                size: 22,
              }),
              new TextRun({
                text: "Each step below details the approval rules, thresholds, and assigned approvers.",
                size: 22,
              }),
            ],
          }),
          new Paragraph({ children: [] }),

          ...buildActiveStepsSummary(data),
          ...buildWorkflowAppendix(data),

          new Paragraph({ children: [] }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: "Generated by ESM Implementation Customer Hub",
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

  return Buffer.from(await Packer.toBuffer(doc));
}

function buildActiveStepsSummary(data: WorkflowData): Paragraph[] {
  const paragraphs: Paragraph[] = [
    new Paragraph({
      heading: HeadingLevel.HEADING_2,
      children: [new TextRun({ text: "Active Workflow Steps", bold: true })],
    }),
  ];

  const steps = Object.entries(data.workflow_steps).sort(([a], [b]) => {
    const numA = parseInt(a.replace("step", ""));
    const numB = parseInt(b.replace("step", ""));
    return numA - numB;
  });

  for (const [, step] of steps) {
    if (!step.active) continue;
    let text = step.label;
    if (step.has_threshold && step.rules[0]?.transaction_total != null) {
      text += ` — Threshold: $${step.rules[0].transaction_total.toLocaleString()}`;
    }
    text += ` — ${step.rules.length} rule(s)`;

    paragraphs.push(
      new Paragraph({
        bullet: { level: 0 },
        children: [new TextRun({ text, size: 22 })],
      }),
    );
  }

  paragraphs.push(new Paragraph({ children: [] }));
  return paragraphs;
}
