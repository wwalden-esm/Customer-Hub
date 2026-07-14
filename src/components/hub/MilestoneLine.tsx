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

interface MilestoneLineProps {
  milestones: HubMilestone[];
  projectId: string;
  initialComments?: MilestoneComment[];
  commentAuthors?: CommentAuthor[];
}

function fmtShort(d: string) {
  return parseLocalDate(d).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function fmtFull(d: string) {
  return parseLocalDate(d).toLocaleDateString("en-US", { weekday: "short", month: "long", day: "numeric", year: "numeric" });
}

export default function MilestoneLine({ milestones, projectId, initialComments = [], commentAuthors = [] }: MilestoneLineProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [comments, setComments] = useState<MilestoneComment[]>(initialComments);
  const [newComment, setNewComment] = useState("");
  const [selectedAuthor, setSelectedAuthor] = useState("");
  const [posting, setPosting] = useState(false);
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
