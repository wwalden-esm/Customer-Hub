"use client";

import { Card } from "@/components/ui/Card";
import { getAllQuestions } from "@/lib/question-store";

interface ProjectRow {
  id: string;
  customerName: string;
  projectName: string;
  status: string;
  daysToGoLive: number | null;
}

interface ScWelcomeProps {
  userName: string;
  projects: ProjectRow[];
  openQuestionCount: number;
}

export default function ScWelcome({ userName, projects, openQuestionCount }: ScWelcomeProps) {
  const firstName = userName.split(" ")[0] || "there";
  const goLiveSoon = projects.filter((p) => p.daysToGoLive !== null && p.daysToGoLive >= 0 && p.daysToGoLive <= 30);
  const atRisk = projects.filter((p) => p.status === "AT_RISK" || p.status === "OFF_TRACK");

  const alerts: Array<{ label: string; href: string; color: string }> = [];

  if (atRisk.length > 0) {
    alerts.push({
      label: `${atRisk.length} project${atRisk.length > 1 ? "s" : ""} at risk`,
      href: "#project-table",
      color: "#ef4444",
    });
  }

  if (goLiveSoon.length > 0) {
    alerts.push({
      label: `${goLiveSoon.length} go-live${goLiveSoon.length > 1 ? "s" : ""} within 30 days`,
      href: "#project-table",
      color: "#f97316",
    });
  }

  if (openQuestionCount > 0) {
    alerts.push({
      label: `${openQuestionCount} unanswered question${openQuestionCount > 1 ? "s" : ""}`,
      href: "/dashboard/questions",
      color: "#3b82f6",
    });
  }

  return (
    <Card padding="sm" className="!px-5 !py-4 mb-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <p className="text-sm text-esm-grey">
            Welcome back, <span className="font-semibold text-esm-black">{firstName}</span>
          </p>
          <p className="text-xs text-esm-muted mt-0.5">
            {projects.length} active project{projects.length !== 1 ? "s" : ""}
          </p>
        </div>
        {alerts.length > 0 && (
          <div className="flex items-center gap-3 flex-wrap">
            {alerts.map((a, i) => (
              <a
                key={i}
                href={a.href}
                className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full border transition-colors hover:opacity-80"
                style={{ borderColor: a.color, color: a.color }}
              >
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: a.color }} />
                {a.label}
              </a>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}
