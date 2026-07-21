"use client";

import { useState } from "react";
import { Button, Card, useToast } from "@/components/ui";

const DOC_TYPES = [
  "Project Charter",
  "Training Guide",
  "Go-Live Checklist",
  "UAT Tracker",
  "UAT Completion Guide",
  "Workflow Document",
  "Custom Report",
  "Other",
] as const;

interface Props {
  projectId: string;
  onClose: () => void;
}

export default function DocumentRequestForm({ projectId, onClose }: Props) {
  const { toast } = useToast();
  const [type, setType] = useState("");
  const [notes, setNotes] = useState("");
  const [sending, setSending] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  function validate() {
    const errs: Record<string, string> = {};
    if (!type) errs.type = "Select a document type";
    if (!notes.trim()) errs.notes = "Add details about what you need";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    setSending(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/ask`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: "Document Request",
          message: `Document type: ${type}\n\n${notes}`,
        }),
      });
      if (!res.ok) throw new Error();
      toast("Document request submitted", "success");
      onClose();
    } catch {
      toast("Failed to submit request", "error");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <Card
        className="max-w-md w-full mx-4 !p-0 overflow-hidden"
        onClick={(e: React.MouseEvent) => e.stopPropagation()}
      >
        <div className="px-5 py-4 border-b border-esm-border dark:border-neutral-700">
          <h2 className="text-sm font-semibold text-esm-black dark:text-neutral-100">Request a document</h2>
        </div>
        <form onSubmit={handleSubmit} className="px-5 py-4 space-y-4">
          <div>
            <label htmlFor="doc-type" className="block text-xs font-medium text-esm-grey dark:text-neutral-400 mb-1">
              Document type
            </label>
            <select
              id="doc-type"
              value={type}
              onChange={(e) => { setType(e.target.value); setErrors((p) => ({ ...p, type: "" })); }}
              className="w-full px-3 py-2 text-sm border border-esm-border dark:border-neutral-600 rounded-card bg-white dark:bg-neutral-700 text-esm-black dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-[var(--hub-accent,#F4333F)]"
            >
              <option value="">Select a type...</option>
              {DOC_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
            {errors.type && <p className="text-xs text-red-600 mt-1" role="alert">{errors.type}</p>}
          </div>
          <div>
            <label htmlFor="doc-notes" className="block text-xs font-medium text-esm-grey dark:text-neutral-400 mb-1">
              Details
            </label>
            <textarea
              id="doc-notes"
              value={notes}
              onChange={(e) => { setNotes(e.target.value); setErrors((p) => ({ ...p, notes: "" })); }}
              rows={3}
              placeholder="Describe what you need and any specific requirements..."
              className="w-full px-3 py-2 text-sm border border-esm-border dark:border-neutral-600 rounded-card bg-white dark:bg-neutral-700 text-esm-black dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-[var(--hub-accent,#F4333F)] resize-none"
            />
            {errors.notes && <p className="text-xs text-red-600 mt-1" role="alert">{errors.notes}</p>}
          </div>
          <div className="flex items-center justify-end gap-2 pt-1">
            <Button type="button" variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
            <Button type="submit" variant="accent" size="sm" disabled={sending}>
              {sending ? "Sending..." : "Submit request"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
