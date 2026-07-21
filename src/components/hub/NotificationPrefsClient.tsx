"use client";

import { useState, useEffect } from "react";
import { Card, SectionLabel, useToast } from "@/components/ui";

interface Prefs {
  emailEnabled: boolean;
  questionReplies: boolean;
  milestoneUpdates: boolean;
  meetingReminders: boolean;
}

const LABELS: { key: keyof Prefs; label: string; description: string }[] = [
  { key: "emailEnabled", label: "Email notifications", description: "Receive email notifications for project updates" },
  { key: "questionReplies", label: "Question replies", description: "Get notified when your questions receive a response" },
  { key: "milestoneUpdates", label: "Milestone updates", description: "Get notified when milestones are completed or updated" },
  { key: "meetingReminders", label: "Meeting reminders", description: "Receive reminders before upcoming meetings" },
];

export default function NotificationPrefsClient({ projectId }: { projectId: string }) {
  const { toast } = useToast();
  const [prefs, setPrefs] = useState<Prefs | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch(`/api/projects/${projectId}/notification-prefs`)
      .then((r) => r.json())
      .then((d) => setPrefs(d.prefs))
      .catch(() => {});
  }, [projectId]);

  async function togglePref(key: keyof Prefs) {
    if (!prefs) return;
    const updated = { ...prefs, [key]: !prefs[key] };
    setPrefs(updated);
    setSaving(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/notification-prefs`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updated),
      });
      if (!res.ok) throw new Error();
      toast("Preferences saved", "success");
    } catch {
      setPrefs(prefs);
      toast("Failed to save preferences", "error");
    } finally {
      setSaving(false);
    }
  }

  if (!prefs) {
    return (
      <Card className="animate-pulse">
        <div className="h-4 bg-esm-grey-light dark:bg-neutral-700 rounded w-48 mb-4" />
        <div className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-10 bg-esm-grey-light dark:bg-neutral-700 rounded" />
          ))}
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <SectionLabel className="mb-4">Notification preferences</SectionLabel>
      <div className="space-y-4">
        {LABELS.map(({ key, label, description }) => (
          <div key={key} className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-esm-black dark:text-neutral-100">{label}</p>
              <p className="text-xs text-esm-grey dark:text-neutral-400 mt-0.5">{description}</p>
            </div>
            <button
              onClick={() => togglePref(key)}
              disabled={saving}
              role="switch"
              aria-checked={prefs[key]}
              aria-label={label}
              className={`relative inline-flex h-5 w-9 shrink-0 rounded-full transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-[var(--hub-accent)] focus-visible:ring-offset-2 ${
                prefs[key] ? "bg-emerald-500" : "bg-esm-border dark:bg-neutral-600"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 rounded-full bg-white shadow transform transition-transform duration-200 mt-0.5 ${
                  prefs[key] ? "translate-x-[18px]" : "translate-x-0.5"
                }`}
              />
            </button>
          </div>
        ))}
      </div>
    </Card>
  );
}
