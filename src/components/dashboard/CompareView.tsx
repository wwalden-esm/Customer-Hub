"use client";

import { useState, useMemo } from "react";
import { Card } from "@/components/ui/Card";
import type { ProjectAnalytics } from "@/lib/health-score";

interface Props {
  allProjects: ProjectAnalytics[];
}

const gradeColors: Record<string, string> = {
  A: "#22c55e", B: "#3b82f6", C: "#eab308", D: "#f97316", F: "#ef4444",
};

const componentLabels: Record<string, string> = {
  milestoneHealth: "Milestones",
  actionItemHealth: "Action Items",
  raidHealth: "RAID",
  timelinePressure: "Timeline",
  completionProgress: "Progress",
  engagementScore: "Engagement",
};

function ScoreBar({ label, value, max = 100 }: { label: string; value: number; max?: number }) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  const color = pct >= 80 ? "#22c55e" : pct >= 60 ? "#eab308" : pct >= 40 ? "#f97316" : "#ef4444";
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-esm-grey w-20 shrink-0">{label}</span>
      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
      <span className="text-xs font-medium text-esm-black w-8 text-right">{Math.round(value)}</span>
    </div>
  );
}

function ProjectColumn({ analytics }: { analytics: ProjectAnalytics }) {
  const { project, healthScore, milestoneStats, actionItemStats, raidStats } = analytics;
  return (
    <div className="flex-1 min-w-[280px]">
      <Card padding="md" className="h-full">
        <div className="text-center mb-4 pb-3 border-b border-esm-border">
          <h3 className="text-sm font-bold text-esm-black truncate">{project.customerName}</h3>
          <p className="text-xs text-esm-grey truncate">{project.projectName}</p>
          <div className="mt-2 flex items-center justify-center gap-2">
            <span
              className="inline-flex items-center justify-center w-10 h-10 rounded-full text-white font-bold text-lg"
              style={{ backgroundColor: gradeColors[healthScore.grade] || "#9ca3af" }}
            >
              {healthScore.grade}
            </span>
            <div className="text-left">
              <p className="text-lg font-bold text-esm-black">{healthScore.overall}</p>
              <p className="text-[10px] text-esm-muted uppercase">{healthScore.riskLevel} risk</p>
            </div>
          </div>
        </div>

        <div className="space-y-2 mb-4">
          <p className="text-[10px] font-bold text-esm-grey uppercase tracking-wider">Health Components</p>
          {Object.entries(healthScore.components).map(([key, value]) => (
            <ScoreBar key={key} label={componentLabels[key] || key} value={value} />
          ))}
        </div>

        <div className="grid grid-cols-2 gap-3 text-center">
          <div className="bg-gray-50 rounded-card p-2">
            <p className="text-lg font-bold text-esm-black">{milestoneStats.completionRate}%</p>
            <p className="text-[10px] text-esm-muted">Milestones</p>
            <p className="text-[10px] text-esm-grey">{milestoneStats.completed}/{milestoneStats.total}</p>
          </div>
          <div className="bg-gray-50 rounded-card p-2">
            <p className="text-lg font-bold text-esm-black">{actionItemStats.total - actionItemStats.completed}</p>
            <p className="text-[10px] text-esm-muted">Open Items</p>
            <p className="text-[10px] text-esm-grey">{actionItemStats.overdue} overdue</p>
          </div>
          <div className="bg-gray-50 rounded-card p-2">
            <p className="text-lg font-bold text-esm-black">{raidStats.openRisks + raidStats.openIssues}</p>
            <p className="text-[10px] text-esm-muted">Open RAID</p>
            <p className="text-[10px] text-esm-grey">{raidStats.blockedItems} blocked</p>
          </div>
          <div className="bg-gray-50 rounded-card p-2">
            <p className="text-lg font-bold text-esm-black">{project.status}</p>
            <p className="text-[10px] text-esm-muted">Status</p>
            <p className="text-[10px] text-esm-grey">{project.currentPhase || "—"}</p>
          </div>
        </div>

        {healthScore.signals.length > 0 && (
          <div className="mt-4 pt-3 border-t border-esm-border">
            <p className="text-[10px] font-bold text-esm-grey uppercase tracking-wider mb-2">Signals</p>
            <div className="space-y-1">
              {healthScore.signals.slice(0, 4).map((s, i) => (
                <div key={i} className="flex items-start gap-1.5">
                  <span className={`text-xs mt-px ${s.type === "critical" ? "text-red-500" : s.type === "warning" ? "text-amber-500" : "text-emerald-500"}`}>
                    {s.type === "critical" ? "●" : s.type === "warning" ? "●" : "●"}
                  </span>
                  <span className="text-xs text-esm-grey">{s.label}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

export default function CompareView({ allProjects }: Props) {
  const [selected, setSelected] = useState<string[]>(() =>
    allProjects.slice(0, Math.min(3, allProjects.length)).map((p) => p.project.id)
  );

  const selectedProjects = useMemo(
    () => allProjects.filter((p) => selected.includes(p.project.id)),
    [allProjects, selected],
  );

  function toggleProject(id: string) {
    setSelected((prev) =>
      prev.includes(id)
        ? prev.filter((p) => p !== id)
        : prev.length < 4
          ? [...prev, id]
          : prev,
    );
  }

  return (
    <div>
      <Card padding="sm" className="!px-5 !py-3 mb-6">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-medium text-esm-grey mr-1">Select projects (max 4):</span>
          {allProjects.map((p) => {
            const isSelected = selected.includes(p.project.id);
            return (
              <button
                key={p.project.id}
                onClick={() => toggleProject(p.project.id)}
                className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                  isSelected
                    ? "bg-esm-black text-white border-esm-black"
                    : "bg-white text-esm-grey border-esm-border hover:border-esm-black"
                }`}
              >
                {p.project.customerName}
              </button>
            );
          })}
        </div>
      </Card>

      {selectedProjects.length === 0 ? (
        <Card padding="lg" className="text-center !py-12">
          <p className="text-sm text-esm-grey">Select at least one project to compare.</p>
        </Card>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-2">
          {selectedProjects.map((p) => (
            <ProjectColumn key={p.project.id} analytics={p} />
          ))}
        </div>
      )}
    </div>
  );
}
