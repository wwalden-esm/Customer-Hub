"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/Card";

const FIRST_RUN_KEY = "esm-hub-staff-welcome-dismissed";

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
  const [showFirstRun, setShowFirstRun] = useState(false);

  useEffect(() => {
    const dismissed = localStorage.getItem(FIRST_RUN_KEY);
    if (!dismissed) {
      setShowFirstRun(true);
    }
  }, []);

  const dismissFirstRun = () => {
    localStorage.setItem(FIRST_RUN_KEY, "true");
    setShowFirstRun(false);
  };

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
    <div>
      {showFirstRun && (
        <Card padding="sm" className="!px-5 !py-4 mb-4 border-l-4" style={{ borderLeftColor: "var(--hub-accent, #F4333F)" }}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-sm font-semibold text-esm-black mb-1">
                Welcome to the ESM Implementation Hub
              </h2>
              <p className="text-xs text-esm-grey mb-3">
                Here are some quick links to get you started:
              </p>
              <div className="flex flex-wrap gap-2">
                <a
                  href="/dashboard/meeting-guide"
                  className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-card bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                  Meeting Guide
                </a>
                <a
                  href="/dashboard/settings"
                  className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-card bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10.343 3.94c.09-.542.56-.94 1.11-.94h1.093c.55 0 1.02.398 1.11.94l.149.894c.07.424.384.764.78.93.398.164.855.142 1.205-.108l.737-.527a1.125 1.125 0 011.45.12l.773.774c.39.389.44 1.002.12 1.45l-.527.737c-.25.35-.272.806-.107 1.204.165.397.505.71.93.78l.893.15c.543.09.94.56.94 1.109v1.094c0 .55-.397 1.02-.94 1.11l-.893.149c-.425.07-.765.383-.93.78-.165.398-.143.854.107 1.204l.527.738c.32.447.269 1.06-.12 1.45l-.774.773a1.125 1.125 0 01-1.449.12l-.738-.527c-.35-.25-.806-.272-1.203-.107-.397.165-.71.505-.781.929l-.149.894c-.09.542-.56.94-1.11.94h-1.094c-.55 0-1.019-.398-1.11-.94l-.148-.894c-.071-.424-.384-.764-.781-.93-.398-.164-.854-.142-1.204.108l-.738.527c-.447.32-1.06.269-1.45-.12l-.773-.774a1.125 1.125 0 01-.12-1.45l.527-.737c.25-.35.273-.806.108-1.204-.165-.397-.506-.71-.93-.78l-.894-.15c-.542-.09-.94-.56-.94-1.109v-1.094c0-.55.398-1.02.94-1.11l.894-.149c.424-.07.765-.383.93-.78.165-.398.143-.854-.107-1.204l-.527-.738a1.125 1.125 0 01.12-1.45l.773-.773a1.125 1.125 0 011.45-.12l.737.527c.35.25.807.272 1.204.107.397-.165.71-.505.78-.929l.15-.894z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Settings
                </a>
                <a
                  href="/dashboard/users"
                  className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-card bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
                  </svg>
                  User Management
                </a>
              </div>
            </div>
            <button
              onClick={dismissFirstRun}
              className="shrink-0 p-1 text-esm-muted hover:text-esm-black transition-colors rounded"
              aria-label="Dismiss welcome banner"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </Card>
      )}
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
    </div>
  );
}
