"use client";

import { useState, useMemo } from "react";
import type { HubMilestone } from "@/types/hub";
import { parseLocalDate } from "@/lib/date-utils";
import { Badge, Card, SectionLabel } from "@/components/ui";
import type { BadgeVariant } from "@/components/ui";
import CollapsibleSection from "@/components/hub/CollapsibleSection";
import MilestoneLine from "@/components/hub/MilestoneLine";

/* ── Local types ── */

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

interface MilestonesClientProps {
  milestones: HubMilestone[];
  projectId: string;
  initialComments: MilestoneComment[];
  commentAuthors: CommentAuthor[];
  initialFeedback: MilestoneFeedback[];
}

/* ── Helpers ── */

function fmtShort(d: string) {
  return parseLocalDate(d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function fmtRange(start: string | null, end: string | null): string {
  if (start && end) return `${fmtShort(start)} – ${fmtShort(end)}`;
  if (start) return `Starts ${fmtShort(start)}`;
  if (end) return `Ends ${fmtShort(end)}`;
  return "No dates set";
}

function statusBadgeVariant(
  status: HubMilestone["status"]
): BadgeVariant {
  switch (status) {
    case "complete":
      return "success";
    case "in-progress":
    case "current":
      return "info";
    case "overdue":
      return "danger";
    case "on-hold":
      return "warning";
    case "upcoming":
    default:
      return "neutral";
  }
}

function statusLabel(status: HubMilestone["status"]): string {
  switch (status) {
    case "complete":
      return "Complete";
    case "in-progress":
    case "current":
      return "In Progress";
    case "overdue":
      return "Overdue";
    case "on-hold":
      return "On Hold";
    case "upcoming":
    default:
      return "Upcoming";
  }
}

const healthDot: Record<string, string> = {
  Green: "#22c55e",
  Yellow: "#eab308",
  Red: "#ef4444",
  Blue: "#3b82f6",
};

/* ── Stat Card ── */

function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <Card padding="sm" className="text-center">
      <div
        className="mx-auto mb-2 h-1 w-10 rounded-full"
        style={{ backgroundColor: color }}
      />
      <p className="text-2xl font-bold text-esm-black">{value}</p>
      <p className="text-xs text-esm-grey mt-1">{label}</p>
    </Card>
  );
}

/* ── Timeline Bar ── */

function TimelineBar({ milestones }: { milestones: HubMilestone[] }) {
  const withDates = milestones.filter((m) => m.startDate || m.endDate);
  if (withDates.length === 0) return null;

  const allDates: number[] = [];
  for (const m of withDates) {
    if (m.startDate) allDates.push(parseLocalDate(m.startDate).getTime());
    if (m.endDate) allDates.push(parseLocalDate(m.endDate).getTime());
    if (m.date) allDates.push(parseLocalDate(m.date).getTime());
  }
  const minTs = Math.min(...allDates);
  const maxTs = Math.max(...allDates);
  const span = maxTs - minTs || 1;

  const barColor = (status: HubMilestone["status"]) => {
    switch (status) {
      case "complete":
        return "#22c55e";
      case "in-progress":
      case "current":
        return "var(--hub-accent, #F4333F)";
      case "overdue":
        return "#ef4444";
      case "on-hold":
        return "#eab308";
      default:
        return "#cbd5e1";
    }
  };

  return (
    <div className="relative w-full overflow-x-auto">
      {/* Axis labels */}
      <div className="flex justify-between text-[10px] text-esm-muted mb-1 px-1">
        <span>
          {new Date(minTs).toLocaleDateString("en-US", {
            month: "short",
            year: "numeric",
          })}
        </span>
        <span>
          {new Date(maxTs).toLocaleDateString("en-US", {
            month: "short",
            year: "numeric",
          })}
        </span>
      </div>

      {/* Track */}
      <div
        className="relative bg-esm-grey-light rounded-card"
        style={{ minHeight: `${withDates.length * 32 + 8}px` }}
      >
        {/* Today marker */}
        {(() => {
          const now = Date.now();
          if (now >= minTs && now <= maxTs) {
            const pct = ((now - minTs) / span) * 100;
            return (
              <div
                className="absolute top-0 bottom-0 w-px bg-esm-muted opacity-50"
                style={{ left: `${pct}%` }}
              >
                <span className="absolute -top-4 -translate-x-1/2 text-[9px] text-esm-muted whitespace-nowrap">
                  Today
                </span>
              </div>
            );
          }
          return null;
        })()}

        {withDates.map((m, i) => {
          const s = m.startDate
            ? parseLocalDate(m.startDate).getTime()
            : m.endDate
              ? parseLocalDate(m.endDate).getTime()
              : minTs;
          const e = m.endDate
            ? parseLocalDate(m.endDate).getTime()
            : m.startDate
              ? parseLocalDate(m.startDate).getTime()
              : maxTs;
          const left = ((s - minTs) / span) * 100;
          const width = Math.max(((e - s) / span) * 100, 0.5);

          return (
            <div
              key={m.id}
              className="absolute flex items-center"
              style={{
                top: `${i * 32 + 4}px`,
                left: `${left}%`,
                width: `${width}%`,
                height: "24px",
                minWidth: "4px",
              }}
              title={`${m.name} (${fmtRange(m.startDate, m.endDate)})`}
            >
              <div
                className="h-5 w-full rounded-sm opacity-80"
                style={{ backgroundColor: barColor(m.status) }}
              />
              <span className="ml-1.5 text-[10px] text-esm-grey truncate whitespace-nowrap pointer-events-none">
                {m.name}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── Main Client Component ── */

type StatusFilter =
  | "all"
  | "upcoming"
  | "in-progress"
  | "complete"
  | "overdue";

export default function MilestonesClient({
  milestones,
  projectId,
  initialComments,
  commentAuthors,
  initialFeedback,
}: MilestonesClientProps) {
  const [phaseFilter, setPhaseFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  /* Unique phases */
  const phases = useMemo(() => {
    const set = new Set<string>();
    for (const m of milestones) {
      if (m.phase) set.add(m.phase);
    }
    return Array.from(set).sort();
  }, [milestones]);

  /* Filtered milestones */
  const filtered = useMemo(() => {
    return milestones.filter((m) => {
      if (phaseFilter !== "all" && m.phase !== phaseFilter) return false;
      if (statusFilter === "all") return true;
      if (statusFilter === "in-progress")
        return m.status === "in-progress" || m.status === "current";
      return m.status === statusFilter;
    });
  }, [milestones, phaseFilter, statusFilter]);

  /* Stats (always from full set, not filtered) */
  const stats = useMemo(() => {
    const total = milestones.length;
    const completed = milestones.filter(
      (m) => m.status === "complete"
    ).length;
    const upcoming = milestones.filter(
      (m) => m.status === "upcoming" || m.status === "on-hold"
    ).length;
    const overdue = milestones.filter(
      (m) => m.status === "overdue"
    ).length;
    return { total, completed, upcoming, overdue };
  }, [milestones]);

  /* Interactive milestones for MilestoneLine (level 1 or flagged as milestone) */
  const lineMilestones = useMemo(
    () => filtered.filter((m) => m.isMilestone || m.level === 1),
    [filtered]
  );

  return (
    <>
      {/* ── Summary Stats ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-5">
        <StatCard
          label="Total Milestones"
          value={stats.total}
          color="var(--hub-accent, #F4333F)"
        />
        <StatCard label="Completed" value={stats.completed} color="#22c55e" />
        <StatCard label="Upcoming" value={stats.upcoming} color="#3b82f6" />
        <StatCard label="Overdue" value={stats.overdue} color="#ef4444" />
      </div>

      {/* ── Timeline Visualization ── */}
      <CollapsibleSection
        id="milestones-timeline"
        title="Timeline"
        className="mb-5"
        defaultExpanded
      >
        <Card padding="md">
          <TimelineBar milestones={milestones} />
        </Card>
      </CollapsibleSection>

      {/* ── Filters ── */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <SectionLabel className="mr-1">Filters</SectionLabel>

        {/* Phase dropdown */}
        <select
          value={phaseFilter}
          onChange={(e) => setPhaseFilter(e.target.value)}
          className="text-sm border border-esm-border rounded-card px-3 py-1.5 bg-white text-esm-black focus:outline-none focus:ring-1"
          style={
            {
              "--tw-ring-color": "var(--hub-accent, #F4333F)",
            } as React.CSSProperties
          }
        >
          <option value="all">All Phases</option>
          {phases.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>

        {/* Status filter buttons */}
        <div className="flex gap-1.5">
          {(
            [
              ["all", "All"],
              ["upcoming", "Upcoming"],
              ["in-progress", "In Progress"],
              ["complete", "Complete"],
              ["overdue", "Overdue"],
            ] as [StatusFilter, string][]
          ).map(([value, label]) => {
            const active = statusFilter === value;
            return (
              <button
                key={value}
                onClick={() => setStatusFilter(value)}
                className={`text-xs font-medium px-3 py-1.5 rounded-card border transition-colors ${
                  active
                    ? "text-white border-transparent"
                    : "text-esm-grey border-esm-border hover:bg-gray-50"
                }`}
                style={
                  active
                    ? { backgroundColor: "var(--hub-accent, #F4333F)" }
                    : undefined
                }
              >
                {label}
              </button>
            );
          })}
        </div>

        {/* Result count */}
        <span className="text-xs text-esm-muted ml-auto">
          {filtered.length} of {milestones.length} milestones
        </span>
      </div>

      {/* ── Interactive Milestone Line ── */}
      {lineMilestones.length > 0 && (
        <CollapsibleSection
          id="milestones-interactive"
          title="Milestone Progress"
          subtitle={`${lineMilestones.filter((m) => m.status === "complete").length} of ${lineMilestones.length} complete`}
          className="mb-5"
          defaultExpanded
        >
          <MilestoneLine
            milestones={lineMilestones}
            projectId={projectId}
            initialComments={initialComments}
            commentAuthors={commentAuthors}
            initialFeedback={initialFeedback}
          />
        </CollapsibleSection>
      )}

      {/* ── Milestone Cards Grid ── */}
      <CollapsibleSection
        id="milestones-cards"
        title="All Milestones"
        subtitle={`${filtered.length} shown`}
        className="mb-5"
        defaultExpanded
      >
        {filtered.length === 0 ? (
          <Card padding="md">
            <p className="text-sm text-esm-muted text-center py-4">
              No milestones match the current filters.
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map((m) => (
              <MilestoneCard key={m.id} milestone={m} />
            ))}
          </div>
        )}
      </CollapsibleSection>
    </>
  );
}

/* ── Milestone Card ── */

function MilestoneCard({ milestone: m }: { milestone: HubMilestone }) {
  const pct = m.percentComplete ?? 0;

  return (
    <Card padding="sm" className="flex flex-col gap-2.5">
      {/* Header row */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          {m.health && (
            <span
              className="w-2 h-2 rounded-full shrink-0"
              style={{
                backgroundColor: healthDot[m.health] ?? "#94a3b8",
              }}
              title={`Health: ${m.health}`}
            />
          )}
          <h3 className="text-sm font-semibold text-esm-black truncate">
            {m.name}
          </h3>
        </div>
        <Badge
          variant={statusBadgeVariant(m.status)}
          className="text-[10px] font-bold tracking-wide uppercase shrink-0"
        >
          {statusLabel(m.status)}
        </Badge>
      </div>

      {/* Phase */}
      {m.phase && <p className="text-xs text-esm-muted">{m.phase}</p>}

      {/* Dates */}
      <p className="text-xs text-esm-grey">
        {fmtRange(m.startDate ?? m.date, m.endDate)}
      </p>

      {/* Progress bar */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] text-esm-muted">Progress</span>
          <span className="text-[10px] font-medium text-esm-grey">
            {pct}%
          </span>
        </div>
        <div className="h-1.5 bg-esm-grey-light rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${pct}%`,
              backgroundColor:
                m.status === "complete"
                  ? "#22c55e"
                  : m.status === "overdue"
                    ? "#ef4444"
                    : "var(--hub-accent, #F4333F)",
            }}
          />
        </div>
      </div>
    </Card>
  );
}
