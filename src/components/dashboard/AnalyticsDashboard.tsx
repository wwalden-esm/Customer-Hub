"use client";

import { useState, useRef } from "react";
import { Card } from "@/components/ui/Card";
import type { PortfolioAnalytics, ProjectAnalytics, HealthScore } from "@/lib/health-score";

interface Props {
  portfolio: PortfolioAnalytics;
}

const riskColors = {
  low: { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200", fill: "#22c55e" },
  moderate: { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200", fill: "#eab308" },
  high: { bg: "bg-orange-50", text: "text-orange-700", border: "border-orange-200", fill: "#f97316" },
  critical: { bg: "bg-red-50", text: "text-red-700", border: "border-red-200", fill: "#ef4444" },
};

const gradeColors: Record<string, string> = {
  A: "#22c55e",
  B: "#3b82f6",
  C: "#eab308",
  D: "#f97316",
  F: "#ef4444",
};

const trendIcons: Record<string, string> = {
  improving: "▲",
  stable: "●",
  declining: "▼",
};

const trendColors: Record<string, string> = {
  improving: "text-emerald-600",
  stable: "text-slate-500",
  declining: "text-red-600",
};

function ScoreRing({ score, grade, size = 72 }: { score: number; grade: string; size?: number }) {
  const r = (size - 8) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - score / 100);

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={`Health score ${score}, grade ${grade}`}>
      <circle
        cx={size / 2} cy={size / 2} r={r}
        fill="none" stroke="#e5e7eb" strokeWidth={6}
      />
      <circle
        cx={size / 2} cy={size / 2} r={r}
        fill="none"
        stroke={gradeColors[grade] || "#6b7280"}
        strokeWidth={6}
        strokeLinecap="round"
        strokeDasharray={circ}
        strokeDashoffset={offset}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
      <text
        x={size / 2} y={size / 2 - 4}
        textAnchor="middle" dominantBaseline="middle"
        className="text-esm-black" style={{ fontSize: size * 0.22, fontWeight: 700 }}
      >
        {score}
      </text>
      <text
        x={size / 2} y={size / 2 + 12}
        textAnchor="middle" dominantBaseline="middle"
        style={{ fontSize: size * 0.15, fontWeight: 600, fill: gradeColors[grade] }}
      >
        {grade}
      </text>
    </svg>
  );
}

function MiniBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden" role="img" aria-label={`Bar chart: ${value} of ${max}`}>
      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
    </div>
  );
}

function Sparkline({ components }: { components: HealthScore["components"] }) {
  const vals = [
    components.milestoneHealth,
    components.actionItemHealth,
    components.raidHealth,
    components.timelinePressure,
    components.completionProgress,
    components.engagementScore,
  ];
  const w = 96;
  const h = 24;
  const step = w / (vals.length - 1);
  const points = vals.map((v, i) => `${i * step},${h - (v / 100) * h}`).join(" ");

  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="inline-block" role="img" aria-label="Health component sparkline">
      <polyline
        points={points}
        fill="none"
        stroke="#6b7280"
        strokeWidth={1.5}
        strokeLinejoin="round"
      />
      {vals.map((v, i) => (
        <circle
          key={i}
          cx={i * step}
          cy={h - (v / 100) * h}
          r={2}
          fill={v >= 70 ? "#22c55e" : v >= 50 ? "#eab308" : "#ef4444"}
        />
      ))}
    </svg>
  );
}

function DataCoverageBar({ coverage }: { coverage: HealthScore["dataCoverage"] }) {
  if (coverage.score === 100) return null;
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="text-esm-muted">Data:</span>
      <div className="flex-1 max-w-[120px]">
        <MiniBar value={coverage.score} max={100} color={coverage.score >= 80 ? "#22c55e" : coverage.score >= 50 ? "#eab308" : "#ef4444"} />
      </div>
      <span className="text-esm-grey">{coverage.score}%</span>
      {coverage.missing.length > 0 && (
        <span className="text-amber-600" title={`Missing: ${coverage.missing.join(", ")}`}>
          {coverage.missing.length} missing
        </span>
      )}
    </div>
  );
}

function FilterBar({ projects, filters, onFilterChange }: {
  projects: ProjectAnalytics[];
  filters: { sc: string; status: string; phase: string };
  onFilterChange: (key: string, value: string) => void;
}) {
  const scs = Array.from(new Set(projects.map(p => p.project.scName).filter(Boolean))).sort();
  const statuses = Array.from(new Set(projects.map(p => p.project.status).filter(Boolean))).sort();
  const phases = Array.from(new Set(projects.map(p => p.project.currentPhase).filter(Boolean))).sort();

  const selectClass = "text-xs border border-esm-border rounded-card px-2 py-1.5 bg-white text-esm-black focus:outline-none focus:ring-1 focus:ring-esm-red";

  return (
    <div className="flex flex-wrap items-center gap-2 mb-4">
      <span className="text-xs text-esm-muted uppercase tracking-wider font-semibold">Filter:</span>
      <select value={filters.sc} onChange={(e) => onFilterChange("sc", e.target.value)} aria-label="Filter by SC" className={selectClass}>
        <option value="">All SCs</option>
        {scs.map(sc => <option key={sc} value={sc}>{sc}</option>)}
      </select>
      <select value={filters.status} onChange={(e) => onFilterChange("status", e.target.value)} aria-label="Filter by status" className={selectClass}>
        <option value="">All Statuses</option>
        {statuses.map(s => <option key={s} value={s}>{s}</option>)}
      </select>
      <select value={filters.phase} onChange={(e) => onFilterChange("phase", e.target.value)} aria-label="Filter by phase" className={selectClass}>
        <option value="">All Phases</option>
        {phases.map(p => <option key={p} value={p}>{p}</option>)}
      </select>
      {(filters.sc || filters.status || filters.phase) && (
        <button
          onClick={() => { onFilterChange("sc", ""); onFilterChange("status", ""); onFilterChange("phase", ""); }}
          className="text-xs text-esm-red hover:text-esm-red-dark font-medium"
        >
          Clear
        </button>
      )}
    </div>
  );
}

function SummaryCards({ portfolio }: { portfolio: PortfolioAnalytics }) {
  const { summary } = portfolio;
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
      <Card padding="sm">
        <p className="text-label text-esm-muted uppercase tracking-wider mb-1">Avg Health</p>
        <p className="text-2xl font-bold text-esm-black">{summary.avgHealthScore}</p>
        <MiniBar value={summary.avgHealthScore} max={100} color={summary.avgHealthScore >= 70 ? "#22c55e" : summary.avgHealthScore >= 50 ? "#eab308" : "#ef4444"} />
      </Card>
      <Card padding="sm">
        <p className="text-label text-esm-muted uppercase tracking-wider mb-1">On Track</p>
        <p className="text-2xl font-bold text-emerald-600">{summary.onTrackCount}</p>
        <p className="text-xs text-esm-grey">of {summary.totalProjects} projects</p>
      </Card>
      <Card padding="sm">
        <p className="text-label text-esm-muted uppercase tracking-wider mb-1">At Risk</p>
        <p className="text-2xl font-bold text-orange-600">{summary.atRiskCount}</p>
        <p className="text-xs text-esm-grey">need attention</p>
      </Card>
      <Card padding="sm">
        <p className="text-label text-esm-muted uppercase tracking-wider mb-1">Critical</p>
        <p className="text-2xl font-bold text-red-600">{summary.healthDistribution.critical}</p>
        <p className="text-xs text-esm-grey">immediate action</p>
      </Card>
    </div>
  );
}

function HealthHeatmap({ projects }: { projects: ProjectAnalytics[] }) {
  const sorted = [...projects].sort((a, b) => a.healthScore.overall - b.healthScore.overall);
  return (
    <Card padding="md" className="mb-6">
      <h2 className="text-sm font-semibold text-esm-black mb-4 uppercase tracking-wider">Portfolio Health Map</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
        {sorted.map((pa) => {
          const rc = riskColors[pa.healthScore.riskLevel];
          return (
            <a
              key={pa.project.id}
              href={`/dashboard/${pa.project.id}`}
              className={`${rc.bg} border ${rc.border} rounded-card p-3 hover:shadow-md transition-shadow block no-underline`}
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <p className="text-xs font-semibold text-esm-black truncate flex-1">
                  {pa.project.customerName}
                </p>
                <span className={`text-xs font-bold ${rc.text}`}>
                  {pa.healthScore.overall}
                </span>
              </div>
              <MiniBar
                value={pa.healthScore.overall}
                max={100}
                color={riskColors[pa.healthScore.riskLevel].fill}
              />
              <p className="text-[10px] text-esm-grey mt-1.5 truncate">
                {pa.healthScore.prediction.primaryRisk}
              </p>
            </a>
          );
        })}
      </div>
    </Card>
  );
}

function ProjectHealthTable({ projects, onSelect }: { projects: ProjectAnalytics[]; onSelect: (p: ProjectAnalytics) => void }) {
  const [sortKey, setSortKey] = useState<"score" | "name" | "risk">("score");
  const sorted = [...projects].sort((a, b) => {
    if (sortKey === "score") return a.healthScore.overall - b.healthScore.overall;
    if (sortKey === "name") return a.project.customerName.localeCompare(b.project.customerName);
    const riskOrder = { critical: 0, high: 1, moderate: 2, low: 3 };
    return riskOrder[a.healthScore.riskLevel] - riskOrder[b.healthScore.riskLevel];
  });

  return (
    <Card padding="sm" className="mb-6">
      <div className="flex items-center justify-between mb-3 px-1">
        <h2 className="text-sm font-semibold text-esm-black uppercase tracking-wider">Project Scores</h2>
        <div className="flex gap-1">
          {(["score", "name", "risk"] as const).map((key) => (
            <button
              key={key}
              onClick={() => setSortKey(key)}
              className={`text-[10px] uppercase tracking-wider px-2 py-1 rounded-card transition-colors ${
                sortKey === key
                  ? "bg-esm-red text-white"
                  : "text-esm-grey hover:bg-slate-50"
              }`}
            >
              {key}
            </button>
          ))}
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-esm-border">
              <th className="text-left py-2 px-2 text-[10px] uppercase tracking-wider text-esm-muted font-semibold">Project</th>
              <th className="text-center py-2 px-2 text-[10px] uppercase tracking-wider text-esm-muted font-semibold">Score</th>
              <th className="text-center py-2 px-2 text-[10px] uppercase tracking-wider text-esm-muted font-semibold">Risk</th>
              <th className="text-center py-2 px-2 text-[10px] uppercase tracking-wider text-esm-muted font-semibold hidden sm:table-cell">Trend</th>
              <th className="text-center py-2 px-2 text-[10px] uppercase tracking-wider text-esm-muted font-semibold hidden md:table-cell">Components</th>
              <th className="text-left py-2 px-2 text-[10px] uppercase tracking-wider text-esm-muted font-semibold hidden lg:table-cell">Primary Risk</th>
              <th className="text-center py-2 px-2 text-[10px] uppercase tracking-wider text-esm-muted font-semibold hidden md:table-cell">Slip %</th>
              <th className="text-center py-2 px-2 text-[10px] uppercase tracking-wider text-esm-muted font-semibold">SC</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((pa) => {
              const rc = riskColors[pa.healthScore.riskLevel];
              return (
                <tr
                  key={pa.project.id}
                  className="border-b border-esm-border last:border-0 hover:bg-slate-50 cursor-pointer transition-colors"
                  tabIndex={0}
                  role="button"
                  onClick={() => onSelect(pa)}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onSelect(pa); } }}
                >
                  <td className="py-2.5 px-2">
                    <p className="font-medium text-esm-black truncate max-w-[180px]">{pa.project.customerName}</p>
                    <p className="text-[10px] text-esm-muted">{pa.project.currentPhase}</p>
                  </td>
                  <td className="text-center py-2.5 px-2">
                    <span className="text-lg font-bold" style={{ color: gradeColors[pa.healthScore.grade] }}>
                      {pa.healthScore.overall}
                    </span>
                  </td>
                  <td className="text-center py-2.5 px-2">
                    <span className={`inline-block text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full ${rc.bg} ${rc.text}`}>
                      {pa.healthScore.riskLevel}
                    </span>
                  </td>
                  <td className="text-center py-2.5 px-2 hidden sm:table-cell">
                    <span className={`text-xs ${trendColors[pa.healthScore.prediction.trend]}`}>
                      {trendIcons[pa.healthScore.prediction.trend]}
                    </span>
                  </td>
                  <td className="text-center py-2.5 px-2 hidden md:table-cell">
                    <Sparkline components={pa.healthScore.components} />
                  </td>
                  <td className="py-2.5 px-2 hidden lg:table-cell">
                    <span className="text-xs text-esm-grey">{pa.healthScore.prediction.primaryRisk}</span>
                  </td>
                  <td className="text-center py-2.5 px-2 hidden md:table-cell">
                    <span className={`text-xs font-medium ${
                      pa.healthScore.prediction.slipProbability > 50 ? "text-red-600" :
                      pa.healthScore.prediction.slipProbability > 25 ? "text-amber-600" : "text-emerald-600"
                    }`}>
                      {pa.healthScore.prediction.slipProbability}%
                    </span>
                  </td>
                  <td className="text-center py-2.5 px-2">
                    <span className="text-xs text-esm-grey truncate max-w-[80px] inline-block">
                      {pa.project.scName?.split(" ")[0] || "—"}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function ProjectDetail({ pa, onClose }: { pa: ProjectAnalytics; onClose: () => void }) {
  const { healthScore: hs, milestoneStats: ms, actionItemStats: ai, raidStats: rs, timelineStats: ts, engagementStats: es } = pa;
  const componentLabels = [
    { key: "milestoneHealth" as const, label: "Milestones", weight: "25%" },
    { key: "actionItemHealth" as const, label: "Action Items", weight: "20%" },
    { key: "raidHealth" as const, label: "RAID Log", weight: "15%" },
    { key: "timelinePressure" as const, label: "Timeline", weight: "15%" },
    { key: "completionProgress" as const, label: "Completion", weight: "15%" },
    { key: "engagementScore" as const, label: "Engagement", weight: "10%" },
  ];

  return (
    <Card padding="md" className="mb-6">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h2 className="text-sm font-semibold text-esm-black">{pa.project.customerName}</h2>
          <p className="text-xs text-esm-grey">{pa.project.projectName}</p>
        </div>
        <div className="flex items-center gap-4">
          <ScoreRing score={hs.overall} grade={hs.grade} size={64} />
          <button onClick={onClose} className="text-esm-grey hover:text-esm-black text-lg leading-none">&times;</button>
        </div>
      </div>

      <DataCoverageBar coverage={hs.dataCoverage} />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 mt-4">
        <div className="space-y-2">
          <p className="text-[10px] uppercase tracking-wider text-esm-muted font-semibold">Score Components</p>
          {componentLabels.map(({ key, label, weight }) => (
            <div key={key}>
              <div className="flex justify-between text-xs mb-0.5">
                <span className="text-esm-grey">{label} <span className="text-esm-muted">({weight})</span></span>
                <span className="font-medium text-esm-black">{hs.components[key]}</span>
              </div>
              <MiniBar
                value={hs.components[key]}
                max={100}
                color={hs.components[key] >= 70 ? "#22c55e" : hs.components[key] >= 50 ? "#eab308" : "#ef4444"}
              />
            </div>
          ))}
        </div>

        <div className="space-y-3">
          <p className="text-[10px] uppercase tracking-wider text-esm-muted font-semibold">Key Metrics</p>
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-slate-50 rounded-card p-2">
              <p className="text-[10px] text-esm-muted">Milestones</p>
              <p className="text-sm font-semibold text-esm-black">{ms.completed}/{ms.total}</p>
              <p className="text-[10px] text-esm-grey">{ms.completionRate}% done</p>
            </div>
            <div className="bg-slate-50 rounded-card p-2">
              <p className="text-[10px] text-esm-muted">Action Items</p>
              <p className="text-sm font-semibold text-esm-black">{ai.completed}/{ai.total}</p>
              <p className="text-[10px] text-esm-grey">{ai.overdue} overdue</p>
            </div>
            <div className="bg-slate-50 rounded-card p-2">
              <p className="text-[10px] text-esm-muted">RAID</p>
              <p className="text-sm font-semibold text-esm-black">{rs.openRisks}R / {rs.openIssues}I</p>
              <p className="text-[10px] text-esm-grey">{rs.blockedItems} blocked</p>
            </div>
            <div className="bg-slate-50 rounded-card p-2">
              <p className="text-[10px] text-esm-muted">Go-Live</p>
              <p className="text-sm font-semibold text-esm-black">
                {ts.daysToGoLive !== null ? `${ts.daysToGoLive}d` : "—"}
              </p>
              <p className="text-[10px] text-esm-grey">
                {ts.progressGap !== null
                  ? `${ts.progressGap > 0 ? "+" : ""}${ts.progressGap}% vs expected`
                  : ts.percentElapsed !== null ? `${ts.percentElapsed}% elapsed` : "No date set"}
              </p>
            </div>
            <div className="bg-slate-50 rounded-card p-2">
              <p className="text-[10px] text-esm-muted">Meetings</p>
              <p className="text-sm font-semibold text-esm-black">{es.meetingsCompleted}/{es.meetingsTotal}</p>
              <p className="text-[10px] text-esm-grey">{es.recapsSent} recaps sent</p>
            </div>
            <div className="bg-slate-50 rounded-card p-2">
              <p className="text-[10px] text-esm-muted">Documents</p>
              <p className="text-sm font-semibold text-esm-black">{es.documentsGenerated}</p>
              <p className="text-[10px] text-esm-grey">generated</p>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <p className="text-[10px] uppercase tracking-wider text-esm-muted font-semibold">Health Signals</p>
          <div className="space-y-1.5">
            {hs.signals.map((s, i) => (
              <div
                key={i}
                className={`flex items-center gap-2 text-xs px-2 py-1.5 rounded-card ${
                  s.type === "critical" ? "bg-red-50 text-red-700" :
                  s.type === "warning" ? "bg-amber-50 text-amber-700" :
                  "bg-emerald-50 text-emerald-700"
                }`}
              >
                <span className="flex-shrink-0">
                  {s.type === "critical" ? "!" : s.type === "warning" ? "~" : "+"}
                </span>
                <span>{s.label}</span>
              </div>
            ))}
          </div>
          <div className="border-t border-esm-border pt-2 mt-2">
            <p className="text-[10px] uppercase tracking-wider text-esm-muted font-semibold mb-1">Prediction</p>
            <div className="flex items-center justify-between text-xs">
              <span className="text-esm-grey">Slip probability</span>
              <span className={`font-semibold ${
                hs.prediction.slipProbability > 50 ? "text-red-600" :
                hs.prediction.slipProbability > 25 ? "text-amber-600" : "text-emerald-600"
              }`}>{hs.prediction.slipProbability}%</span>
            </div>
            <div className="flex items-center justify-between text-xs mt-1">
              <span className="text-esm-grey">Trend</span>
              <span className={`font-medium ${trendColors[hs.prediction.trend]}`}>
                {trendIcons[hs.prediction.trend]} {hs.prediction.trend}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <a
          href={`/dashboard/${pa.project.id}`}
          className="text-xs text-esm-red hover:text-esm-red-dark font-medium no-underline"
        >
          View project details &rarr;
        </a>
      </div>
    </Card>
  );
}

function RiskRadar({ projects }: { projects: ProjectAnalytics[] }) {
  const topRisks = projects
    .filter(p => p.healthScore.riskLevel !== "low")
    .sort((a, b) => a.healthScore.overall - b.healthScore.overall)
    .slice(0, 5);

  if (topRisks.length === 0) {
    return (
      <Card padding="md" className="mb-6">
        <h2 className="text-sm font-semibold text-esm-black mb-3 uppercase tracking-wider">Risk Radar</h2>
        <p className="text-sm text-esm-grey">All projects are on track — no elevated risks detected.</p>
      </Card>
    );
  }

  return (
    <Card padding="md" className="mb-6">
      <h2 className="text-sm font-semibold text-esm-black mb-3 uppercase tracking-wider">Risk Radar</h2>
      <div className="space-y-3">
        {topRisks.map((pa) => {
          const rc = riskColors[pa.healthScore.riskLevel];
          return (
            <div key={pa.project.id} className="flex items-center gap-3">
              <div className="flex-shrink-0 w-10">
                <ScoreRing score={pa.healthScore.overall} grade={pa.healthScore.grade} size={40} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <p className="text-sm font-medium text-esm-black truncate">{pa.project.customerName}</p>
                  <span className={`text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded-full ${rc.bg} ${rc.text}`}>
                    {pa.healthScore.riskLevel}
                  </span>
                </div>
                <p className="text-xs text-esm-grey">{pa.healthScore.prediction.primaryRisk}</p>
                <div className="flex gap-3 mt-1">
                  {pa.healthScore.signals.filter(s => s.type === "critical").slice(0, 2).map((s, i) => (
                    <span key={i} className="text-[10px] text-red-600">{s.label}</span>
                  ))}
                </div>
              </div>
              <div className="flex-shrink-0 text-right">
                <p className={`text-xs font-medium ${
                  pa.healthScore.prediction.slipProbability > 50 ? "text-red-600" : "text-amber-600"
                }`}>
                  {pa.healthScore.prediction.slipProbability}% slip
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function ScWorkload({ workload }: { workload: PortfolioAnalytics["scWorkload"] }) {
  if (workload.length === 0) return null;

  return (
    <Card padding="md" className="mb-6">
      <h2 className="text-sm font-semibold text-esm-black mb-3 uppercase tracking-wider">SC Workload</h2>
      <div className="space-y-3">
        {workload.map((sc) => (
          <div key={sc.email} className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-esm-blue flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
              {sc.name.split(" ").map(w => w[0]).join("").slice(0, 2)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-esm-black">{sc.name}</p>
              <div className="flex items-center gap-3 text-xs text-esm-grey">
                <span>{sc.projectCount} project{sc.projectCount === 1 ? "" : "s"}</span>
                <span>Avg: {sc.avgHealth}</span>
                {sc.criticalCount > 0 && (
                  <span className="text-red-600 font-medium">{sc.criticalCount} critical</span>
                )}
              </div>
            </div>
            <div className="flex-shrink-0 w-20">
              <MiniBar
                value={sc.avgHealth}
                max={100}
                color={sc.avgHealth >= 70 ? "#22c55e" : sc.avgHealth >= 50 ? "#eab308" : "#ef4444"}
              />
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function ComponentBreakdown({ projects }: { projects: ProjectAnalytics[] }) {
  if (projects.length === 0) return null;

  const labels = [
    { key: "milestoneHealth" as const, label: "Milestones" },
    { key: "actionItemHealth" as const, label: "Action Items" },
    { key: "raidHealth" as const, label: "RAID" },
    { key: "timelinePressure" as const, label: "Timeline" },
    { key: "completionProgress" as const, label: "Completion" },
    { key: "engagementScore" as const, label: "Engagement" },
  ];

  const avgs = labels.map(({ key, label }) => {
    const avg = Math.round(projects.reduce((sum, p) => sum + p.healthScore.components[key], 0) / projects.length);
    return { label, avg };
  });

  const maxVal = 100;
  const barH = 24;
  const gap = 8;
  const labelW = 90;
  const chartW = 300;
  const totalH = avgs.length * (barH + gap) - gap;

  return (
    <Card padding="md" className="mb-6">
      <h2 className="text-sm font-semibold text-esm-black mb-3 uppercase tracking-wider">Portfolio Component Averages</h2>
      <svg width="100%" viewBox={`0 0 ${labelW + chartW + 40} ${totalH}`} className="max-w-lg">
        {avgs.map(({ label, avg }, i) => {
          const y = i * (barH + gap);
          const barW = (avg / maxVal) * chartW;
          const color = avg >= 70 ? "#22c55e" : avg >= 50 ? "#eab308" : "#ef4444";
          return (
            <g key={label}>
              <text x={labelW - 4} y={y + barH / 2} textAnchor="end" dominantBaseline="middle" className="text-esm-grey" style={{ fontSize: 11 }}>
                {label}
              </text>
              <rect x={labelW} y={y + 2} width={chartW} height={barH - 4} rx={3} fill="#f1f5f9" />
              <rect x={labelW} y={y + 2} width={barW} height={barH - 4} rx={3} fill={color} />
              <text x={labelW + barW + 6} y={y + barH / 2} dominantBaseline="middle" style={{ fontSize: 11, fontWeight: 600, fill: color }}>
                {avg}
              </text>
            </g>
          );
        })}
      </svg>
    </Card>
  );
}

function ExportButton({ }: { contentRef?: React.RefObject<HTMLDivElement | null> }) {
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await fetch("/api/analytics/export");
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const w = window.open(url, "_blank");
      if (w) {
        w.addEventListener("afterprint", () => URL.revokeObjectURL(url));
      }
    } catch {
      window.print();
    } finally {
      setExporting(false);
    }
  };

  return (
    <button
      onClick={handleExport}
      disabled={exporting}
      className="text-xs border border-esm-border rounded-card px-3 py-1.5 text-esm-grey hover:text-esm-black hover:bg-slate-50 transition-colors disabled:opacity-50"
    >
      {exporting ? "Generating..." : "Export PDF"}
    </button>
  );
}

export default function AnalyticsDashboard({ portfolio }: Props) {
  const [selectedProject, setSelectedProject] = useState<ProjectAnalytics | null>(null);
  const [filters, setFilters] = useState({ sc: "", status: "", phase: "" });
  const contentRef = useRef<HTMLDivElement>(null);

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const filteredProjects = portfolio.projects.filter(pa => {
    if (filters.sc && pa.project.scName !== filters.sc) return false;
    if (filters.status && pa.project.status !== filters.status) return false;
    if (filters.phase && pa.project.currentPhase !== filters.phase) return false;
    return true;
  });

  const filteredPortfolio = {
    ...portfolio,
    projects: filteredProjects,
  };

  return (
    <div ref={contentRef}>
      <div className="flex items-center justify-between mb-4">
        <FilterBar
          projects={portfolio.projects}
          filters={filters}
          onFilterChange={handleFilterChange}
        />
        <ExportButton contentRef={contentRef} />
      </div>

      <SummaryCards portfolio={filteredPortfolio} />

      {selectedProject && (
        <ProjectDetail pa={selectedProject} onClose={() => setSelectedProject(null)} />
      )}

      <HealthHeatmap projects={filteredProjects} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="lg:col-span-2">
          <ProjectHealthTable projects={filteredProjects} onSelect={setSelectedProject} />
        </div>
        <div>
          <RiskRadar projects={filteredProjects} />
          <ScWorkload workload={portfolio.scWorkload} />
        </div>
      </div>

      <ComponentBreakdown projects={filteredProjects} />
    </div>
  );
}
