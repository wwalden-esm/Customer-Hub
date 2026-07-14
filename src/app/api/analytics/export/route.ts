import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  getProjectList,
  getSmartsheetConfig,
  getProjectMilestones,
  getProjectActionItems,
  getRaidLogItems,
  getProjectMeetings,
  getProjectDocuments,
} from "@/lib/smartsheet-data";
import {
  computeHealthScore,
  computePortfolioAnalytics,
  loadHealthHistory,
  getProjectHistory,
} from "@/lib/health-score";
import type { ProjectAnalytics, PortfolioAnalytics } from "@/lib/health-score";

export const dynamic = "force-dynamic";

const gradeColors: Record<string, string> = {
  A: "#22c55e", B: "#3b82f6", C: "#eab308", D: "#f97316", F: "#ef4444",
};

const riskColors: Record<string, string> = {
  low: "#22c55e", moderate: "#eab308", high: "#f97316", critical: "#ef4444",
};

function buildProjectRow(p: ProjectAnalytics): string {
  const h = p.healthScore;
  const gc = gradeColors[h.grade] || "#9ca3af";
  const rc = riskColors[h.riskLevel] || "#9ca3af";
  return `
    <tr>
      <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb;">
        <strong>${p.project.customerName}</strong><br>
        <span style="font-size: 11px; color: #6b7280;">${p.project.projectName}</span>
      </td>
      <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb; text-align: center;">
        <span style="display: inline-block; width: 28px; height: 28px; line-height: 28px; border-radius: 50%; background: ${gc}; color: white; font-weight: bold; font-size: 14px; text-align: center;">${h.grade}</span>
      </td>
      <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb; text-align: center; font-weight: 600;">${h.overall}</td>
      <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb; text-align: center;">
        <span style="color: ${rc}; font-weight: 500; text-transform: capitalize;">${h.riskLevel}</span>
      </td>
      <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb; text-align: center;">${p.milestoneStats.completed}/${p.milestoneStats.total}</td>
      <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb; text-align: center;">${p.actionItemStats.overdue}</td>
      <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb; text-align: center;">${p.raidStats.openRisks + p.raidStats.openIssues}</td>
    </tr>`;
}

function buildHtml(portfolio: PortfolioAnalytics, generatedBy: string): string {
  const now = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  const s = portfolio.summary;

  const projectRows = portfolio.projects
    .sort((a, b) => a.healthScore.overall - b.healthScore.overall)
    .map(buildProjectRow)
    .join("");

  const topRisks = s.topRisks.slice(0, 5).map((r) =>
    `<li style="margin-bottom: 4px;"><strong>${r.projectName}</strong>: ${r.risk} (score: ${r.score})</li>`
  ).join("");

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Portfolio Health Report — ${now}</title>
  <style>
    @page { margin: 0.75in; size: letter; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #2D2826; font-size: 13px; line-height: 1.5; }
    .header { display: flex; align-items: center; justify-content: space-between; border-bottom: 3px solid #F4333F; padding-bottom: 12px; margin-bottom: 24px; }
    .logo { display: flex; align-items: center; gap: 8px; }
    .logo-box { width: 32px; height: 32px; background: #F4333F; border-radius: 4px; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 11px; }
    .meta { text-align: right; font-size: 11px; color: #686468; }
    h1 { font-size: 20px; font-weight: 600; margin-bottom: 4px; }
    h2 { font-size: 15px; font-weight: 600; margin: 24px 0 12px; color: #2D2826; border-bottom: 1px solid #e5e7eb; padding-bottom: 4px; }
    .summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 24px; }
    .summary-card { border: 1px solid #e5e7eb; border-radius: 6px; padding: 12px; text-align: center; }
    .summary-card .value { font-size: 24px; font-weight: 700; }
    .summary-card .label { font-size: 10px; color: #686468; text-transform: uppercase; letter-spacing: 0.05em; }
    table { width: 100%; border-collapse: collapse; border: 1px solid #e5e7eb; border-radius: 6px; font-size: 12px; }
    th { padding: 8px 12px; text-align: left; font-size: 10px; font-weight: 600; color: #686468; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 2px solid #e5e7eb; background: #f9fafb; }
    .footer { margin-top: 32px; padding-top: 12px; border-top: 1px solid #e5e7eb; font-size: 10px; color: #9ca3af; text-align: center; }
    @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo">
      <div class="logo-box">ESM</div>
      <div>
        <h1>Portfolio Health Report</h1>
        <span style="font-size: 12px; color: #686468;">${s.totalProjects} Active Projects</span>
      </div>
    </div>
    <div class="meta">
      <div>${now}</div>
      <div>Generated by ${generatedBy}</div>
    </div>
  </div>

  <div class="summary-grid">
    <div class="summary-card">
      <div class="value">${s.avgHealthScore}</div>
      <div class="label">Avg Health Score</div>
    </div>
    <div class="summary-card">
      <div class="value" style="color: #22c55e;">${s.onTrackCount}</div>
      <div class="label">On Track</div>
    </div>
    <div class="summary-card">
      <div class="value" style="color: #ef4444;">${s.atRiskCount}</div>
      <div class="label">At Risk / Critical</div>
    </div>
    <div class="summary-card">
      <div class="value">${s.totalProjects}</div>
      <div class="label">Total Projects</div>
    </div>
  </div>

  <h2>Health Distribution</h2>
  <div style="display: flex; gap: 16px; margin-bottom: 24px;">
    <div style="flex: 1; text-align: center;">
      <div style="font-size: 18px; font-weight: 700; color: #22c55e;">${s.healthDistribution.low}</div>
      <div style="font-size: 10px; color: #686468;">Low Risk</div>
    </div>
    <div style="flex: 1; text-align: center;">
      <div style="font-size: 18px; font-weight: 700; color: #eab308;">${s.healthDistribution.moderate}</div>
      <div style="font-size: 10px; color: #686468;">Moderate</div>
    </div>
    <div style="flex: 1; text-align: center;">
      <div style="font-size: 18px; font-weight: 700; color: #f97316;">${s.healthDistribution.high}</div>
      <div style="font-size: 10px; color: #686468;">High</div>
    </div>
    <div style="flex: 1; text-align: center;">
      <div style="font-size: 18px; font-weight: 700; color: #ef4444;">${s.healthDistribution.critical}</div>
      <div style="font-size: 10px; color: #686468;">Critical</div>
    </div>
  </div>

  <h2>Project Details</h2>
  <table>
    <thead>
      <tr>
        <th>Project</th>
        <th style="text-align: center;">Grade</th>
        <th style="text-align: center;">Score</th>
        <th style="text-align: center;">Risk</th>
        <th style="text-align: center;">Milestones</th>
        <th style="text-align: center;">Overdue</th>
        <th style="text-align: center;">Open RAID</th>
      </tr>
    </thead>
    <tbody>
      ${projectRows}
    </tbody>
  </table>

  ${topRisks ? `
  <h2>Top Risks</h2>
  <ul style="padding-left: 20px;">
    ${topRisks}
  </ul>
  ` : ""}

  <div class="footer">
    ESM Implementation Customer Hub &middot; Portfolio Health Report &middot; ${now}
  </div>
</body>
</html>`;
}

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userEmail = session.user.email || "";
  const userRole = session.user.role || "SC";
  const userName = session.user.name || userEmail;

  const allProjects = getProjectList();
  const projects = userRole === "ADMIN"
    ? allProjects
    : allProjects.filter((p) => p.scEmail === userEmail || p.pmEmail === userEmail);

  const history = loadHealthHistory();

  const projectAnalytics = await Promise.all(
    projects.map(async (project) => {
      const config = getSmartsheetConfig(project.id);
      const [milestones, actionItems, raidItems, meetings, documents] = await Promise.all([
        config.projectPlanSheetId ? getProjectMilestones(config.projectPlanSheetId) : Promise.resolve([]),
        config.actionItemSheetId ? getProjectActionItems(config.actionItemSheetId) : Promise.resolve([]),
        config.raidLogSheetId ? getRaidLogItems(config.raidLogSheetId) : Promise.resolve([]),
        config.meetingTrackerSheetId ? getProjectMeetings(config.meetingTrackerSheetId) : Promise.resolve([]),
        config.documentSheetId ? getProjectDocuments(config.documentSheetId) : Promise.resolve([]),
      ]);
      const projectHistory = getProjectHistory(project.id, history);
      return computeHealthScore(project, milestones, actionItems, raidItems, meetings, documents, config, projectHistory);
    })
  );

  const portfolio = computePortfolioAnalytics(projectAnalytics);
  const html = buildHtml(portfolio, userName);

  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Disposition": `inline; filename="portfolio-health-report.html"`,
    },
  });
}
