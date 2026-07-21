"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";

const STORAGE_KEY = "esm-hub-onboarding-dismissed";

interface Step {
  label: string;
  description: string;
  href: string;
  key: string;
}

const STEPS: Step[] = [
  { key: "dashboard", label: "Review your dashboard", description: "See project status, milestones, and metrics at a glance", href: "/hub" },
  { key: "workflow", label: "Upload procurement docs", description: "Upload your approval workflow documents for AI extraction", href: "/hub/workflow-builder" },
  { key: "milestones", label: "Check milestones", description: "View your implementation timeline and upcoming deadlines", href: "/hub/milestones" },
  { key: "documents", label: "Browse documents", description: "Access generated documents and request new ones", href: "/hub/documents" },
  { key: "help", label: "Visit the help center", description: "Find FAQs and contact your Solutions Consultant", href: "/hub/help" },
];

interface Props {
  projectName: string;
}

export default function OnboardingChecklist({ projectName }: Props) {
  const [visible, setVisible] = useState(false);
  const [visited, setVisited] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (localStorage.getItem(STORAGE_KEY)) return;
    setVisible(true);
    const saved = localStorage.getItem("esm-hub-onboarding-visited");
    if (saved) setVisited(new Set(JSON.parse(saved)));
  }, []);

  function markVisited(key: string) {
    setVisited((prev) => {
      const next = new Set(prev);
      next.add(key);
      localStorage.setItem("esm-hub-onboarding-visited", JSON.stringify(Array.from(next)));
      return next;
    });
  }

  function dismiss() {
    localStorage.setItem(STORAGE_KEY, "true");
    setVisible(false);
  }

  if (!visible) return null;

  const completedCount = STEPS.filter((s) => visited.has(s.key)).length;
  const progress = Math.round((completedCount / STEPS.length) * 100);

  return (
    <Card padding="sm" className="!px-5 !py-4 mb-5 border-l-4" style={{ borderLeftColor: "var(--hub-accent, #F4333F)" }}>
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <h2 className="text-sm font-semibold text-esm-black dark:text-neutral-100">
            Welcome to {projectName}
          </h2>
          <p className="text-xs text-esm-grey dark:text-neutral-400 mt-0.5">
            Here are some things to get you started ({completedCount}/{STEPS.length} complete)
          </p>
        </div>
        <button
          onClick={dismiss}
          className="shrink-0 p-1 text-esm-muted hover:text-esm-black dark:hover:text-white transition-colors rounded"
          aria-label="Dismiss onboarding guide"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <div className="w-full bg-esm-grey-light dark:bg-neutral-700 rounded-full h-1.5 mb-3">
        <div
          className="h-1.5 rounded-full transition-all duration-500"
          style={{ width: `${progress}%`, backgroundColor: "var(--hub-accent, #F4333F)" }}
        />
      </div>
      <div className="space-y-1.5">
        {STEPS.map((step) => {
          const done = visited.has(step.key);
          return (
            <Link
              key={step.key}
              href={step.href}
              onClick={() => markVisited(step.key)}
              className={`flex items-center gap-3 px-3 py-2 rounded-card text-sm transition-colors no-underline ${
                done
                  ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400"
                  : "hover:bg-slate-50 dark:hover:bg-neutral-700 text-esm-black dark:text-neutral-200"
              }`}
            >
              {done ? (
                <svg className="w-4 h-4 shrink-0 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <div className="w-4 h-4 shrink-0 rounded-full border-2 border-esm-border dark:border-neutral-500" />
              )}
              <div className="min-w-0">
                <p className={`font-medium ${done ? "line-through opacity-60" : ""}`}>{step.label}</p>
                <p className="text-xs text-esm-muted dark:text-neutral-500">{step.description}</p>
              </div>
            </Link>
          );
        })}
      </div>
    </Card>
  );
}
