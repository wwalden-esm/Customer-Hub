"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

interface QuestionMessage {
  id: string;
  text: string;
  authorName: string;
  authorEmail: string;
  authorType: "customer" | "staff";
  createdAt: string;
}

interface QuestionItem {
  id: string;
  projectId: string;
  category: string;
  subject: string;
  message: string;
  senderName: string;
  senderEmail: string;
  createdAt: string;
  status: "open" | "replied" | "closed";
  messages: QuestionMessage[];
  reply?: string;
  repliedBy?: string;
  repliedAt?: string;
}

export default function QuestionThread({
  questions: initialQuestions,
  projectId,
}: {
  questions: QuestionItem[];
  projectId: string;
}) {
  const [questions, setQuestions] = useState(initialQuestions);
  const [replyingId, setReplyingId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  function formatDateTime(iso: string) {
    const d = new Date(iso);
    return `${d.toLocaleDateString("en-US", { month: "short", day: "numeric" })} at ${d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`;
  }

  async function handleReply(questionId: string) {
    if (!replyText.trim()) return;
    setSending(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/ask`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionId, message: replyText.trim() }),
      });
      if (res.ok) {
        const updated = await res.json();
        setQuestions((prev) =>
          prev.map((q) => (q.id === questionId ? { ...q, ...updated } : q)),
        );
        setReplyingId(null);
        setReplyText("");
      }
    } finally {
      setSending(false);
    }
  }

  if (questions.length === 0) {
    return (
      <Card padding="lg" className="text-center !py-12">
        <p className="text-sm text-esm-grey mb-3">No questions yet.</p>
        <a
          href="/hub/ask"
          className="text-sm font-medium transition-colors hover:opacity-80"
          style={{ color: "var(--hub-accent, #F4333F)" }}
        >
          Ask your first question
        </a>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {questions.map((q) => {
        const isClosed = q.status === "closed";
        const canReply = !isClosed;

        return (
          <Card key={q.id} padding="md" className={isClosed ? "opacity-60" : ""}>
            <div className="flex items-start justify-between gap-3 mb-2">
              <div className="flex items-center gap-2">
                <Badge
                  variant={
                    q.status === "replied" ? "success" : q.status === "closed" ? "neutral" : "warning"
                  }
                  pill
                  className="text-[10px]"
                >
                  {q.status === "replied" ? "Replied" : q.status === "closed" ? "Closed" : "Open"}
                </Badge>
                <span className="text-xs text-esm-muted">{q.category}</span>
              </div>
              <span className="text-xs text-esm-muted">{formatDate(q.createdAt)}</span>
            </div>
            <p className={`text-sm font-medium mb-3 ${isClosed ? "text-esm-grey line-through" : "text-esm-black"}`}>
              {q.subject}
            </p>

            {/* Message thread */}
            <div className="space-y-2">
              {(q.messages && q.messages.length > 0 ? q.messages : []).map((msg, idx) => (
                <div
                  key={msg.id || idx}
                  className={`text-sm rounded-lg px-3 py-2 ${
                    msg.authorType === "staff"
                      ? "bg-blue-50 border border-blue-100 ml-6"
                      : "bg-gray-50 border border-gray-100 mr-6"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-xs font-medium ${msg.authorType === "staff" ? "text-blue-700" : "text-esm-black"}`}>
                      {msg.authorName}
                      {msg.authorType === "staff" && (
                        <span className="text-[10px] font-normal text-blue-500 ml-1">Staff</span>
                      )}
                    </span>
                    <span className="text-[10px] text-esm-muted">
                      {formatDateTime(msg.createdAt)}
                    </span>
                  </div>
                  <p className="text-sm text-esm-grey whitespace-pre-wrap">{msg.text}</p>
                </div>
              ))}
            </div>

            {/* Reply input for customers */}
            {canReply && replyingId !== q.id && (
              <button
                onClick={() => setReplyingId(q.id)}
                className="mt-3 text-xs font-medium transition-colors hover:opacity-80"
                style={{ color: "var(--hub-accent, #F4333F)" }}
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
                  placeholder="Type your follow-up message..."
                  aria-label="Reply message"
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
                    className="text-xs font-medium px-4 py-1.5 rounded-card text-white hover:opacity-90 disabled:opacity-50"
                    style={{ backgroundColor: "var(--hub-accent, #F4333F)" }}
                  >
                    {sending ? "Sending..." : "Send"}
                  </button>
                </div>
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}
