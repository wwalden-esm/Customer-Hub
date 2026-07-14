"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";

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
  customerName: string;
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

export default function QuestionsManager({ questions }: { questions: QuestionItem[] }) {
  const [items, setItems] = useState(questions);
  const [filter, setFilter] = useState<"all" | "open" | "replied" | "closed">("all");
  const [projectFilter, setProjectFilter] = useState<string>("all");
  const [replyingId, setReplyingId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

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
        body: JSON.stringify({ questionId, action: "reply", reply: replyText.trim() }),
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

  async function handleAction(questionId: string, action: "close" | "reopen") {
    setActionLoading(questionId);
    try {
      const res = await fetch("/api/admin/questions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionId, action }),
      });
      if (res.ok) {
        const updated = await res.json();
        setItems((prev) =>
          prev.map((q) => (q.id === questionId ? { ...q, ...updated } : q)),
        );
      }
    } finally {
      setActionLoading(null);
    }
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }

  function formatDateTime(iso: string) {
    const d = new Date(iso);
    return `${d.toLocaleDateString("en-US", { month: "short", day: "numeric" })} at ${d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`;
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 mb-4">
        {(["all", "open", "replied", "closed"] as const).map((f) => (
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
          {filtered.map((q) => {
            const isClosed = q.status === "closed";
            return (
              <Card key={q.id} padding="md" className={isClosed ? "opacity-60" : ""}>
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                        q.status === "open"
                          ? "bg-amber-50 text-amber-700"
                          : q.status === "replied"
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {q.status === "open" ? "Open" : q.status === "replied" ? "Replied" : "Closed"}
                    </span>
                    <span className="text-xs text-esm-muted">{q.category}</span>
                    <span className="text-xs font-medium text-esm-black">{q.customerName}</span>
                  </div>
                  <span className="text-xs text-esm-muted shrink-0">
                    {formatDate(q.createdAt)}
                  </span>
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
                          ? "bg-blue-50 border border-blue-100 ml-4"
                          : "bg-gray-50 border border-gray-100 mr-4"
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-xs font-medium ${msg.authorType === "staff" ? "text-blue-700" : "text-esm-black"}`}>
                          {msg.authorName}
                        </span>
                        <span className="text-[10px] text-esm-muted">
                          {formatDateTime(msg.createdAt)}
                        </span>
                      </div>
                      <p className="text-sm text-esm-grey whitespace-pre-wrap">{msg.text}</p>
                    </div>
                  ))}
                </div>

                {/* Action buttons */}
                <div className="flex items-center gap-2 mt-3 pt-3 border-t border-esm-border">
                  {!isClosed && replyingId !== q.id && (
                    <button
                      onClick={() => setReplyingId(q.id)}
                      className="text-xs font-medium text-esm-blue hover:underline"
                    >
                      Reply
                    </button>
                  )}
                  {q.status === "replied" && (
                    <button
                      onClick={() => handleAction(q.id, "close")}
                      disabled={actionLoading === q.id}
                      className="text-xs font-medium text-gray-500 hover:text-gray-700 hover:underline"
                    >
                      {actionLoading === q.id ? "Closing..." : "Close"}
                    </button>
                  )}
                  {isClosed && (
                    <button
                      onClick={() => handleAction(q.id, "reopen")}
                      disabled={actionLoading === q.id}
                      className="text-xs font-medium text-amber-600 hover:underline"
                    >
                      {actionLoading === q.id ? "Reopening..." : "Reopen"}
                    </button>
                  )}
                </div>

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
            );
          })}
        </div>
      )}
    </div>
  );
}
