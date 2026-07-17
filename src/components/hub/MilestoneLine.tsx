"use client";

import { useState, useCallback } from "react";
import type { HubMilestone } from "@/types/hub";
import { parseLocalDate } from "@/lib/date-utils";
import { SectionLabel, Card } from "@/components/ui";

interface MilestoneComment {
  id: string;
  milestoneId: string;
  message: string;
  authorName: string;
  createdAt: string;
}

interface CommentAuthor {
  name: string;
  email: string;
}

interface MilestoneFeedback {
  id: string;
  milestoneId: string;
  rating: "positive" | "negative";
  contactName: string;
  contactEmail: string;
}

interface MilestoneLineProps {
  milestones: HubMilestone[];
  projectId: string;
  initialComments?: MilestoneComment[];
  commentAuthors?: CommentAuthor[];
  initialFeedback?: MilestoneFeedback[];
}

function fmtShort(d: string) {
  return parseLocalDate(d).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function fmtFull(d: string) {
  return parseLocalDate(d).toLocaleDateString("en-US", { weekday: "short", month: "long", day: "numeric", year: "numeric" });
}

export default function MilestoneLine({ milestones, projectId, initialComments = [], commentAuthors = [], initialFeedback = [] }: MilestoneLineProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [comments, setComments] = useState<MilestoneComment[]>(initialComments);
  const [newComment, setNewComment] = useState("");
  const [selectedAuthor, setSelectedAuthor] = useState("");
  const [posting, setPosting] = useState(false);
  const [feedback, setFeedback] = useState<MilestoneFeedback[]>(initialFeedback);
  const [submittingFeedback, setSubmittingFeedback] = useState<string | null>(null);
  const completed = milestones.filter((m) => m.status === "complete").length;
  const railPct = milestones.length > 1 ? (completed / (milestones.length - 1)) * 100 : 0;

  const HEALTH_DOT: Record<string, string> = {
    Green: "#22c55e",
    Yellow: "#eab308",
    Red: "#ef4444",
    Blue: "#3b82f6",
  };

  const expanded = expandedId ? milestones.find((m) => m.id === expandedId) : null;
  const expandedComments = expandedId
    ? comments.filter((c) => c.milestoneId === expandedId)
    : [];

  const handlePostComment = useCallback(async () => {
    if (!expandedId || !newComment.trim()) return;
    const author = commentAuthors.find((a) => a.name === selectedAuthor);
    setPosting(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/milestones/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          milestoneId: expandedId,
          milestoneName: expanded?.name || expandedId,
          message: newComment.trim(),
          ...(author ? { authorName: author.name, authorEmail: author.email } : {}),
        }),
      });
      if (res.ok) {
        const comment = await res.json();
        setComments((prev) => [...prev, comment]);
        setNewComment("");
      }
    } finally {
      setPosting(false);
    }
  }, [expandedId, newComment, projectId, selectedAuthor, commentAuthors]);

  const handleFeedback = useCallback(async (milestoneId: string, rating: "positive" | "negative") => {
    const author = commentAuthors.find((a) => a.name === selectedAuthor);
    setSubmittingFeedback(milestoneId);
    try {
      const res = await fetch(`/api/projects/${projectId}/milestones/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          milestoneId,
          rating,
          ...(author ? { contactName: author.name, contactEmail: author.email } : {}),
        }),
      });
      if (res.ok) {
        const fb = await res.json();
        setFeedback((prev) => {
          // Replace existing feedback for same milestone+contact or add new
          const filtered = prev.filter(
            (f) => !(f.milestoneId === milestoneId && f.contactEmail === fb.contactEmail),
          );
          return [...filtered, fb];
        });
      }
    } finally {
      setSubmittingFeedback(null);
    }
  }, [projectId, selectedAuthor, commentAuthors]);

  return (
    <section className="mb-5" aria-labelledby="milestones-heading">
      <Card padding="sm" className="!px-6 !pt-6 !pb-7">
      <SectionLabel className="mb-7"><h2 id="milestones-heading">
        Project Milestones
      </h2></SectionLabel>
      <div className="overflow-x-auto pb-1" role="list" aria-label={`${completed} of ${milestones.length} milestones complete`}>
        <div className="flex items-start min-w-max relative">
          <div className="absolute top-[7px] left-5 right-5 h-0.5 bg-[#E2E0E1] z-0" aria-hidden="true" />
          <div
            className="absolute top-[7px] left-5 h-0.5 z-[1] transition-[width] duration-500"
            style={{ width: `calc(${railPct}% - 20px)`, backgroundColor: "var(--hub-accent)" }}
            aria-hidden="true"
          />
          {milestones.map((m) => {
            const isC = m.status === "complete";
            const isI = m.status === "in-progress";
            const isH = m.status === "on-hold";
            const isExpanded = expandedId === m.id;
            const commentCount = comments.filter((c) => c.milestoneId === m.id).length;

            const dotStyle: React.CSSProperties = isC
              ? { backgroundColor: "var(--hub-accent)", borderColor: "var(--hub-accent)" }
              : isI
                ? { backgroundColor: "#fff", borderColor: "var(--hub-accent)", boxShadow: "0 0 0 3px var(--hub-accent-light, rgba(244,51,63,0.15))" }
                : isH
                  ? { backgroundColor: "#dbeafe", borderColor: "#3b82f6" }
                  : { backgroundColor: "#f9fafb", borderColor: "#E2E0E1" };

            const cardStyle: React.CSSProperties = isC
              ? { backgroundColor: "var(--hub-accent-light, #FEF2F2)", borderColor: "var(--hub-accent-border, rgba(244,51,63,0.4))" }
              : isI
                ? { backgroundColor: "var(--hub-accent-light, #FFF3F3)", borderColor: "var(--hub-accent-border, rgba(244,51,63,0.5))" }
                : isH
                  ? { backgroundColor: "#eff6ff", borderColor: "#93c5fd" }
                  : {};

            const cardCls = !isC && !isI && !isH ? "bg-gray-50 border-esm-border" : "";

            const statusText = isC ? "Complete" : isI ? "Active" : isH ? "On Hold" : "Upcoming";
            const label = isC ? "✓ Done" : isI ? "Active" : isH ? "On Hold" : "Upcoming";
            const labelStyle: React.CSSProperties = isC || isI ? { color: "var(--hub-accent)" } : {};
            const labelCls = isC || isI ? "" : isH ? "text-blue-600" : "text-esm-muted";

            return (
              <div key={m.id} className="flex flex-col items-center w-[140px] shrink-0" role="listitem" aria-label={`${m.name}: ${statusText}${m.date ? `, ${fmtShort(m.date)}` : ""}`}>
                <div className="flex items-center w-full mb-3 relative z-[2]">
                  <div className="flex-1" />
                  <div className="w-3.5 h-3.5 rounded-full border-2 shrink-0" style={dotStyle} aria-hidden="true" />
                  <div className="flex-1" />
                </div>
                <button
                  onClick={() => setExpandedId(isExpanded ? null : m.id)}
                  className={`border rounded-card p-2.5 w-[118px] text-center cursor-pointer transition-shadow ${cardCls} ${isExpanded ? "ring-2 ring-offset-1" : "hover:shadow-md"}`}
                  style={{ ...cardStyle, ...(isExpanded ? { ringColor: "var(--hub-accent)" } : {}) }}
                  aria-expanded={isExpanded}
                >
                  <div className="flex items-center justify-center gap-1 mb-1">
                    {m.health && m.health !== "Green" && (
                      <span
                        className="inline-block w-1.5 h-1.5 rounded-full shrink-0"
                        style={{ backgroundColor: HEALTH_DOT[m.health] }}
                        aria-label={`Health: ${m.health}`}
                      />
                    )}
                    <span className={`text-[9px] font-extrabold tracking-wider uppercase ${labelCls}`} style={labelStyle}>
                      {label}
                    </span>
                  </div>
                  <div className="text-xs font-bold text-esm-black leading-tight mb-1">{m.name}</div>
                  {m.date && <div className="text-[11px] text-esm-grey">{fmtShort(m.date)}</div>}
                  {m.percentComplete != null && !isNaN(Number(m.percentComplete)) && Number(m.percentComplete) > 0 && Number(m.percentComplete) < 1 && (
                    <div className="mt-1.5 w-full h-1 bg-[#E2E0E1] rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${Math.round(m.percentComplete * 100)}%`, backgroundColor: "var(--hub-accent)" }}
                      />
                    </div>
                  )}
                  {m.phase && (
                    <span className="inline-block mt-1 text-[9px] text-esm-grey bg-black/5 rounded-card px-1.5 py-px">
                      {m.phase}
                    </span>
                  )}
                  {commentCount > 0 && (
                    <div className="flex items-center justify-center gap-0.5 mt-1 text-[10px] text-esm-muted">
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                      {commentCount}
                    </div>
                  )}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {expanded && (
        <div className="mt-4 p-4 border border-esm-border rounded-card bg-gray-50 animate-in slide-in-from-top-1">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-sm font-bold text-esm-black">{expanded.name}</h3>
              {expanded.phase && (
                <p className="text-xs text-esm-grey mt-0.5">Phase: {expanded.phase}</p>
              )}
            </div>
            <button onClick={() => setExpandedId(null)} className="text-esm-muted hover:text-esm-grey" aria-label="Close details">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
            <div>
              <p className="text-[10px] font-bold text-esm-grey uppercase tracking-wider">Status</p>
              <p className="text-sm text-esm-black mt-0.5 capitalize">{expanded.status}</p>
            </div>
            {expanded.date && (
              <div>
                <p className="text-[10px] font-bold text-esm-grey uppercase tracking-wider">Target Date</p>
                <p className="text-sm text-esm-black mt-0.5">{fmtFull(expanded.date)}</p>
              </div>
            )}
            {expanded.percentComplete != null && !isNaN(Number(expanded.percentComplete)) && (
              <div>
                <p className="text-[10px] font-bold text-esm-grey uppercase tracking-wider">Progress</p>
                <p className="text-sm text-esm-black mt-0.5">{Math.round(Number(expanded.percentComplete) * 100)}%</p>
              </div>
            )}
            {expanded.health && (
              <div>
                <p className="text-[10px] font-bold text-esm-grey uppercase tracking-wider">Health</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: HEALTH_DOT[expanded.health] || "#9ca3af" }} />
                  <span className="text-sm text-esm-black">{expanded.health}</span>
                </div>
              </div>
            )}
          </div>

          {/* Feedback section for completed milestones */}
          {expanded.status === "complete" && (
            <div className="mt-4 pt-3 border-t border-esm-border">
              <p className="text-[10px] font-bold text-esm-grey uppercase tracking-wider mb-2">
                How did this milestone go?
              </p>
              {(() => {
                const milestoneFeedback = feedback.filter((f) => f.milestoneId === expanded.id);
                const hasPositive = milestoneFeedback.some((f) => f.rating === "positive");
                const hasNegative = milestoneFeedback.some((f) => f.rating === "negative");
                const isSubmitting = submittingFeedback === expanded.id;
                return (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleFeedback(expanded.id, "positive")}
                      disabled={isSubmitting}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-card border transition-colors ${
                        hasPositive
                          ? "bg-green-50 border-green-300 text-green-700"
                          : "border-esm-border text-esm-grey hover:bg-green-50 hover:border-green-300 hover:text-green-700"
                      } disabled:opacity-50`}
                      aria-label="Thumbs up"
                    >
                      <svg className="w-4 h-4" fill={hasPositive ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={hasPositive ? 0 : 2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6.633 10.25c.806 0 1.533-.446 2.031-1.08a9.041 9.041 0 0 1 2.861-2.4c.723-.384 1.35-.956 1.653-1.715a4.498 4.498 0 0 0 .322-1.672V2.75a.75.75 0 0 1 .75-.75 2.25 2.25 0 0 1 2.25 2.25c0 1.152-.26 2.243-.723 3.218-.266.558.107 1.282.725 1.282m0 0h3.126c1.026 0 1.945.694 2.054 1.715.045.422.068.85.068 1.285a11.95 11.95 0 0 1-2.649 7.521c-.388.482-.987.729-1.605.729H13.48c-.483 0-.964-.078-1.423-.23l-3.114-1.04a4.501 4.501 0 0 0-1.423-.23H5.904m10.598-9.75H14.25M5.904 18.5c.083.205.173.405.27.602.197.4-.078.898-.523.898h-.908c-.889 0-1.713-.518-1.972-1.368a12 12 0 0 1-.521-3.507c0-1.553.295-3.036.831-4.398C3.387 9.953 4.167 9.5 5 9.5h1.053c.472 0 .745.556.5.96a8.958 8.958 0 0 0-1.302 4.665c0 1.194.232 2.333.654 3.375Z" />
                      </svg>
                      {hasPositive ? "Rated" : "Good"}
                    </button>
                    <button
                      onClick={() => handleFeedback(expanded.id, "negative")}
                      disabled={isSubmitting}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-card border transition-colors ${
                        hasNegative
                          ? "bg-red-50 border-red-300 text-red-700"
                          : "border-esm-border text-esm-grey hover:bg-red-50 hover:border-red-300 hover:text-red-700"
                      } disabled:opacity-50`}
                      aria-label="Thumbs down"
                    >
                      <svg className="w-4 h-4" fill={hasNegative ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={hasNegative ? 0 : 2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M7.498 15.25H4.372c-1.026 0-1.945-.694-2.054-1.715A12.137 12.137 0 0 1 2.25 12c0-2.848.992-5.464 2.649-7.521C5.287 3.997 5.886 3.75 6.504 3.75h4.369a4.5 4.5 0 0 1 1.423.23l3.114 1.04a4.5 4.5 0 0 0 1.423.23h1.294M7.498 15.25c.618 0 .991.724.725 1.282A7.471 7.471 0 0 0 7.5 19.75 2.25 2.25 0 0 0 9.75 22a.75.75 0 0 0 .75-.75v-.633c0-.573.11-1.14.322-1.672.304-.76.93-1.33 1.653-1.715a9.04 9.04 0 0 0 2.86-2.4c.498-.634 1.226-1.08 2.032-1.08h.384m-10.253 1.5H9.7m8.075-9.75c.01.05.027.1.05.148.593 1.2.925 2.55.925 3.977 0 1.31-.263 2.56-.736 3.7-.09.218-.22.42-.375.6" />
                      </svg>
                      {hasNegative ? "Rated" : "Needs Work"}
                    </button>
                    {milestoneFeedback.length > 0 && (
                      <span className="text-[10px] text-esm-muted ml-2">
                        {milestoneFeedback.length} rating{milestoneFeedback.length !== 1 ? "s" : ""}
                      </span>
                    )}
                  </div>
                );
              })()}
            </div>
          )}

          {/* Comments section */}
          <div className="mt-4 pt-3 border-t border-esm-border">
            <p className="text-[10px] font-bold text-esm-grey uppercase tracking-wider mb-2">
              Comments {expandedComments.length > 0 && `(${expandedComments.length})`}
            </p>
            {expandedComments.length > 0 && (
              <div className="space-y-2 mb-3 max-h-48 overflow-y-auto">
                {expandedComments.map((c) => (
                  <div key={c.id} className="bg-white rounded-card px-3 py-2 border border-esm-border">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-xs font-medium text-esm-black">{c.authorName}</span>
                      <span className="text-[10px] text-esm-muted">
                        {new Date(c.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </span>
                    </div>
                    <p className="text-xs text-esm-grey whitespace-pre-wrap">{c.message}</p>
                  </div>
                ))}
              </div>
            )}
            {commentAuthors.length > 0 && (
              <div className="mb-2">
                <select
                  value={selectedAuthor}
                  onChange={(e) => setSelectedAuthor(e.target.value)}
                  aria-label="Select commenter"
                  className="text-xs border border-esm-border rounded-card px-3 py-1.5 bg-white focus:outline-none focus:border-esm-black w-full sm:w-auto"
                >
                  <option value="">Select your name...</option>
                  {commentAuthors.map((a) => (
                    <option key={a.email || a.name} value={a.name}>{a.name}{a.email ? ` (${a.email})` : ""}</option>
                  ))}
                </select>
              </div>
            )}
            <div className="flex gap-2">
              <input
                type="text"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !posting && handlePostComment()}
                placeholder="Add a comment..."
                aria-label="Add a comment"
                className="flex-1 text-xs border border-esm-border rounded-card px-3 py-1.5 focus:outline-none focus:border-esm-black"
              />
              <button
                onClick={handlePostComment}
                disabled={posting || !newComment.trim() || (commentAuthors.length > 0 && !selectedAuthor)}
                className="text-xs font-medium px-3 py-1.5 rounded-card text-white transition-colors hover:opacity-90 disabled:opacity-50"
                style={{ backgroundColor: "var(--hub-accent, #F4333F)" }}
              >
                {posting ? "..." : "Post"}
              </button>
            </div>
          </div>
        </div>
      )}
      </Card>
    </section>
  );
}
