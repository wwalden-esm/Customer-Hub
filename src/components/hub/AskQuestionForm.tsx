"use client";

import { useState } from "react";
import { Card } from "@/components/ui";
import { useToast } from "@/components/ui";

interface AskQuestionFormProps {
  projectId: string;
  projectName: string;
  senderName: string;
  senderEmail: string;
  scName: string;
  initialCategory?: string;
}

const CATEGORIES = [
  "General Question",
  "Technical Issue",
  "Schedule / Timeline",
  "Action Item Clarification",
  "Document Request",
  "Meeting Request",
  "Other",
];

export default function AskQuestionForm({
  projectId,
  projectName,
  senderName,
  senderEmail,
  scName,
  initialCategory,
}: AskQuestionFormProps) {
  const [category, setCategory] = useState(
    initialCategory && CATEGORIES.includes(initialCategory) ? initialCategory : CATEGORIES[0]
  );
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const { toast } = useToast();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!message.trim()) return;

    setSending(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/ask`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category,
          subject: subject.trim() || `${category} — ${projectName}`,
          message: message.trim(),
          senderName,
          senderEmail,
        }),
      });

      if (!res.ok) throw new Error();
      setSent(true);
      toast("Question sent to your implementation team", "success");
    } catch {
      toast("Failed to send. Please try emailing your SC directly.", "error");
    } finally {
      setSending(false);
    }
  }

  if (sent) {
    return (
      <Card padding="lg" className="text-center !py-12">
        <div
          className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4"
          style={{ backgroundColor: "var(--hub-accent-light, #FEE2E4)" }}
        >
          <svg className="w-6 h-6" style={{ color: "var(--hub-accent, #F4333F)" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-lg font-semibold text-esm-black mb-2">Question Sent</h2>
        <p className="text-sm text-esm-grey mb-4">
          {scName} will receive your message and respond via email.
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={() => { setSent(false); setSubject(""); setMessage(""); }}
            className="text-sm font-medium px-4 py-2 rounded-card border border-esm-border hover:bg-gray-50 transition-colors"
          >
            Ask Another Question
          </button>
          <a
            href="/hub"
            className="text-sm font-medium px-4 py-2 rounded-card text-white transition-colors hover:opacity-90"
            style={{ backgroundColor: "var(--hub-accent, #F4333F)" }}
          >
            Back to Dashboard
          </a>
        </div>
      </Card>
    );
  }

  return (
    <Card padding="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="category" className="block text-xs font-medium text-esm-grey mb-1">
            Category
          </label>
          <select
            id="category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full text-sm border border-esm-border rounded-card px-3 py-2 bg-white focus:outline-none focus:border-esm-black"
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="subject" className="block text-xs font-medium text-esm-grey mb-1">
            Subject <span className="text-esm-muted">(optional)</span>
          </label>
          <input
            id="subject"
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder={`${category} — ${projectName}`}
            className="w-full text-sm border border-esm-border rounded-card px-3 py-2 focus:outline-none focus:border-esm-black"
          />
        </div>

        <div>
          <label htmlFor="message" className="block text-xs font-medium text-esm-grey mb-1">
            Message
          </label>
          <textarea
            id="message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={6}
            required
            placeholder="Describe your question or request..."
            className="w-full text-sm border border-esm-border rounded-card px-3 py-2 focus:outline-none focus:border-esm-black resize-y"
          />
        </div>

        <div className="flex items-center justify-between pt-2">
          <p className="text-xs text-esm-muted">
            From: {senderName} ({senderEmail})
          </p>
          <button
            type="submit"
            disabled={sending || !message.trim()}
            className="inline-flex items-center gap-1.5 px-5 py-2 text-sm font-medium text-white rounded-card transition-colors hover:opacity-90 disabled:opacity-50"
            style={{ backgroundColor: "var(--hub-accent, #F4333F)" }}
          >
            {sending ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Sending...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
                Send Message
              </>
            )}
          </button>
        </div>
      </form>
    </Card>
  );
}
