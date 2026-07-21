"use client";

import { useState, useEffect } from "react";
import { Card, useToast } from "@/components/ui";

const STORAGE_KEY = "esm-hub-satisfaction-dismissed";
const RATINGS = [
  { emoji: "\u{1F620}", label: "Frustrated", value: 1 },
  { emoji: "\u{1F615}", label: "Concerned", value: 2 },
  { emoji: "\u{1F610}", label: "Okay", value: 3 },
  { emoji: "\u{1F642}", label: "Good", value: 4 },
  { emoji: "\u{1F60D}", label: "Great", value: 5 },
] as const;

interface Props {
  projectId: string;
}

export default function SatisfactionWidget({ projectId }: Props) {
  const { toast } = useToast();
  const [visible, setVisible] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    const dismissed = localStorage.getItem(STORAGE_KEY);
    if (!dismissed) {
      setVisible(true);
    } else {
      const dismissedDate = new Date(dismissed);
      const daysSince = (Date.now() - dismissedDate.getTime()) / 86400000;
      if (daysSince > 14) setVisible(true);
    }
  }, []);

  function dismiss() {
    localStorage.setItem(STORAGE_KEY, new Date().toISOString());
    setVisible(false);
  }

  async function handleRating(value: number) {
    setSubmitted(true);
    try {
      await fetch(`/api/projects/${projectId}/ask`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: "Feedback",
          message: `Implementation satisfaction rating: ${value}/5`,
        }),
      });
      toast("Thanks for your feedback", "success");
    } catch {
      // silent — feedback is best-effort
    }
    setTimeout(dismiss, 1500);
  }

  if (!visible) return null;

  return (
    <Card padding="sm" className="!px-5 !py-4 mt-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          {submitted ? (
            <p className="text-sm text-esm-grey dark:text-neutral-400">Thanks for sharing your feedback.</p>
          ) : (
            <>
              <p className="text-sm font-medium text-esm-black dark:text-neutral-100">How is your implementation going?</p>
              <div className="flex items-center gap-3 mt-2">
                {RATINGS.map((r) => (
                  <button
                    key={r.value}
                    onClick={() => handleRating(r.value)}
                    className="text-xl hover:scale-125 transition-transform focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--hub-accent)] rounded"
                    aria-label={r.label}
                    title={r.label}
                  >
                    {r.emoji}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
        <button
          onClick={dismiss}
          className="shrink-0 p-1 text-esm-muted hover:text-esm-black dark:hover:text-white transition-colors rounded"
          aria-label="Dismiss feedback prompt"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </Card>
  );
}
