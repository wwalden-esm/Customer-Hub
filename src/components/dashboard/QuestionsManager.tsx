"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";

interface QuestionItem {
  id: string;
  projectId: string;
  customerName: string;
  category: string;
  subject: string;
  message: string;
  senderName: string;
  senderEmail: string;
  createdAt: string;
  status: "open" | "replied";
  reply?: string;
  repliedBy?: string;
  repliedAt?: string;
}

export default function QuestionsManager({ questions }: { questions: QuestionItem[] }) {
  const [items, setItems] = useState(questions);
  const [filter, setFilter] = useState<"all" | "open" | "replied">("all");
  const [projectFilter, setProjectFilter] = useState<string>("all");
  const [replyingId, setReplyingId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);

  const projectNames = Array.from(new Set(items.map((q) => q.customerName))).sort();

  const filtered = items.filter((q) => {
    if (filter !== "all" && q.status !== filter) return false;
    if (projectFilter !== "all" && q.customerName !== projectFilter) return false;
    return true;
  });

  async function handleReply(questionId: string) {
    if (!replyText.trim()) return;
    setSending(true);
    try {
      const res = await fetch("/api/admin/questions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionId, reply: replyText.trim() }),
      });
      if (res.ok) {
        const updated = await res.json();
        setItems((prev) =>
          prev.map((q) => (q.id === questionId ? { ...q, ...updated } : q)),
        );
        setReplyingId(null);
        setReplyText("");
      }
    } finally {
      setSending(false);
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 mb-4">
        {(["all", "open", "replied"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`text-xs px-3 py-1.5 rounded-full border transition-colors capitalize ${
              filter === f
                ? "bg-esm-black text-white border-esm-black"
                : "bg-white text-esm-grey border-esm-border hover:border-esm-black"
            }`}
          >
            {f} ({items.filter((q) => f === "all" || q.status === f).length})
          </button>
        ))}
        {projectNames.length > 1 && (
          <>
            <span className="text-esm-border mx-1">|</span>
            <select
              value={projectFilter}
              onChange={(e) => setProjectFilter(e.target.value)}
              className="text-xs border border-esm-border rounded-card px-2 py-1.5 bg-white text-esm-black focus:outline-none focus:border-esm-black"
            >
              <option value="all">All Projects</option>
              {projectNames.map((name) => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          </>
        )}
      </div>

      {filtered.length === 0 ? (
        <Card padding="lg" className="text-center !py-12">
          <p className="text-sm text-esm-grey">No questions to show.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((q) => (
            <Card key={q.id} padding="md">
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                      q.status === "open"
                        ? "bg-amber-50 text-amber-700"
                        : "bg-emerald-50 text-emerald-700"
                    }`}
                  >
                    {q.status === "open" ? "Open" : "Replied"}
                  </span>
                  <span className="text-xs text-esm-muted">{q.category}</span>
                  <span className="text-xs font-medium text-esm-black">{q.customerName}</span>
                </div>
                <span className="text-xs text-esm-muted shrink-0">
                  {new Date(q.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                </span>
              </div>
              <p className="text-sm font-medium text-esm-black mb-1">{q.subject}</p>
              <p className="text-sm text-esm-grey whitespace-pre-wrap mb-1">{q.message}</p>
              <p className="text-xs text-esm-muted">From: {q.senderName}</p>

              {q.reply && (
                <div className="mt-3 pt-3 border-t border-esm-border">
                  <p className="text-xs font-medium text-esm-black mb-1">
                    Reply by {q.repliedBy}
                    {q.repliedAt && (
                      <span className="text-esm-muted font-normal ml-2">
                        {new Date(q.repliedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </span>
                    )}
                  </p>
                  <p className="text-sm text-esm-grey whitespace-pre-wrap">{q.reply}</p>
                </div>
              )}

              {q.status === "open" && replyingId !== q.id && (
                <button
                  onClick={() => setReplyingId(q.id)}
                  className="mt-3 text-xs font-medium text-esm-blue hover:underline"
                >
                  Reply
                </button>
              )}

              {replyingId === q.id && (
                <div className="mt-3 pt-3 border-t border-esm-border">
                  <textarea
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    rows={3}
                    placeholder="Type your reply..."
                    className="w-full text-sm border border-esm-border rounded-card px-3 py-2 focus:outline-none focus:border-esm-black resize-y mb-2"
                  />
                  <div className="flex gap-2 justify-end">
                    <button
                      onClick={() => { setReplyingId(null); setReplyText(""); }}
                      className="text-xs px-3 py-1.5 rounded-card border border-esm-border hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => handleReply(q.id)}
                      disabled={sending || !replyText.trim()}
                      className="text-xs font-medium px-4 py-1.5 rounded-card text-white bg-esm-blue hover:opacity-90 disabled:opacity-50"
                    >
                      {sending ? "Sending..." : "Send Reply"}
                    </button>
                  </div>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
