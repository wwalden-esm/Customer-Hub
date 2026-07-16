import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCustomerSession } from "@/lib/magic-link";
import { getHubDashboardData } from "@/lib/hub-data";
import { getProjectConfirmations } from "@/lib/checklist-store";
import { parseLocalDate } from "@/lib/date-utils";
import GoLiveReadiness from "@/components/hub/GoLiveReadiness";
import CollapsibleSection from "@/components/hub/CollapsibleSection";
import { Badge, Card, SectionLabel } from "@/components/ui";
import type { ChecklistConfirmationInfo } from "@/types/hub";

export async function generateMetadata(): Promise<Metadata> {
  return { title: "Go-Live Readiness" };
}

/* ── helpers ── */

function countdownColor(days: number): string {
  if (days < 14) return "#EF4444";
  if (days <= 30) return "#F59E0B";
  return "#22C55E";
}

/* ── page ── */

export default async function GoLivePage() {
  const session = await getCustomerSession();
  if (!session) redirect("/hub/login");

  const data = await getHubDashboardData(session.projectId, session.name ?? undefined);
  if (!data) redirect("/hub/login");

  const { project, milestones, actionItems, goLiveReadiness, daysToGoLive } = data;

  const checklistConfirmations: ChecklistConfirmationInfo[] = getProjectConfirmations(
    session.projectId,
  ).map((c) => ({
    itemKey: c.itemKey,
    confirmedBy: c.confirmedBy,
    confirmedAt: c.confirmedAt,
    note: c.note,
  }));

  /* ── readiness score ── */
  const confirmedKeys = new Set(checklistConfirmations.map((c) => c.itemKey));
  const readyCount = goLiveReadiness.filter(
    (item) => item.done || confirmedKeys.has(item.key),
  ).length;
  const totalItems = goLiveReadiness.length;
  const readinessPercent = totalItems > 0 ? Math.round((readyCount / totalItems) * 100) : 0;

  /* ── open blockers ── */
  const overdueActions = actionItems.filter((a) => a.isOverdue);
  const overdueMilestones = milestones.filter((m) => m.status === "overdue");
  const hasBlockers = overdueActions.length > 0 || overdueMilestones.length > 0;

  /* ── milestone completion by phase ── */
  const phaseMap = new Map<string, { complete: number; total: number }>();
  for (const m of milestones) {
    const phase = m.phase ?? "Unphased";
    const entry = phaseMap.get(phase) ?? { complete: 0, total: 0 };
    entry.total += 1;
    if (m.status === "complete") entry.complete += 1;
    phaseMap.set(phase, entry);
  }
  const phases = Array.from(phaseMap.entries()).map(([phase, counts]) => ({
    phase,
    ...counts,
    percent: counts.total > 0 ? Math.round((counts.complete / counts.total) * 100) : 0,
  }));

  /* ── "what's left" counts ── */
  const remainingMilestones = milestones.filter((m) => m.status !== "complete").length;
  const openActionItems = actionItems.filter((a) => a.status !== "done").length;
  const raidMetric = data.metrics.find((m) => m.metricType === "raid");
  const unresolvedRaid = raidMetric ? raidMetric.total - raidMetric.current : 0;

  /* ── formatted go-live date ── */
  const goLiveDate = project.goLiveDate
    ? parseLocalDate(project.goLiveDate).toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : null;

  return (
    <>
      {/* ── Header ── */}
      <div className="mb-6">
        <a
          href="/hub"
          className="inline-flex items-center gap-1 text-xs font-medium text-esm-grey hover:underline mb-3"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Back to Dashboard
        </a>
        <h1 className="text-2xl font-semibold text-esm-black">Go-Live Readiness</h1>
      </div>

      {/* ── Section 1: Countdown Hero + Readiness Score ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
        {/* Countdown hero */}
        <Card className="!py-8 !px-6 text-center">
          {daysToGoLive !== null && goLiveDate ? (
            <>
              <p
                className="text-6xl font-extrabold leading-none"
                style={{ color: countdownColor(daysToGoLive) }}
              >
                {daysToGoLive}
              </p>
              <p className="text-sm font-medium text-esm-grey mt-2">
                {daysToGoLive === 1 ? "day" : "days"} until go-live
              </p>
              <p className="text-xs text-esm-muted mt-1">{goLiveDate}</p>
            </>
          ) : (
            <>
              <p className="text-3xl font-bold text-esm-muted leading-none">--</p>
              <p className="text-sm text-esm-grey mt-2">Go-live date not set</p>
              <p className="text-xs text-esm-muted mt-1">
                Contact your implementation team to establish a target date.
              </p>
            </>
          )}
        </Card>

        {/* Readiness score */}
        <Card className="!py-8 !px-6 text-center flex flex-col items-center justify-center">
          <div className="relative w-28 h-28 mb-3">
            <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
              <circle
                cx="60"
                cy="60"
                r="52"
                fill="none"
                stroke="currentColor"
                strokeWidth="10"
                className="text-gray-100"
              />
              <circle
                cx="60"
                cy="60"
                r="52"
                fill="none"
                strokeWidth="10"
                strokeLinecap="round"
                strokeDasharray={`${(readinessPercent / 100) * 2 * Math.PI * 52} ${2 * Math.PI * 52}`}
                style={{ stroke: "var(--hub-accent, #F4333F)" }}
              />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-2xl font-extrabold text-esm-black">
              {readinessPercent}%
            </span>
          </div>
          <SectionLabel>Readiness Score</SectionLabel>
          <p className="text-xs text-esm-muted mt-1">
            {readyCount} of {totalItems} items complete
          </p>
        </Card>
      </div>

      {/* ── Section 2: Go-Live Checklist ── */}
      <CollapsibleSection id="go-live-checklist" title="Go-Live Checklist" className="mb-5" defaultExpanded>
        <GoLiveReadiness
          items={goLiveReadiness}
          daysToGoLive={daysToGoLive}
          projectId={session.projectId}
          confirmations={checklistConfirmations}
        />
      </CollapsibleSection>

      {/* ── Section 3: Open Blockers ── */}
      {hasBlockers && (
        <CollapsibleSection
          id="open-blockers"
          title="Open Blockers"
          subtitle={`${overdueActions.length + overdueMilestones.length} items at risk`}
          className="mb-5"
          defaultExpanded
        >
          <Card>
            {overdueMilestones.length > 0 && (
              <div className="mb-4">
                <SectionLabel className="mb-2">Overdue Milestones</SectionLabel>
                <ul className="space-y-2">
                  {overdueMilestones.map((m) => (
                    <li
                      key={m.id}
                      className="flex items-start justify-between gap-3 text-sm border-l-2 border-red-400 pl-3 py-1"
                    >
                      <div className="min-w-0">
                        <p className="font-medium text-esm-black">{m.name}</p>
                        {m.endDate && (
                          <p className="text-xs text-esm-muted mt-0.5">
                            Due{" "}
                            {parseLocalDate(m.endDate).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                            })}
                          </p>
                        )}
                      </div>
                      <Badge variant="danger" className="shrink-0 text-[10px] font-bold tracking-wide uppercase">
                        Overdue
                      </Badge>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {overdueActions.length > 0 && (
              <div>
                <SectionLabel className="mb-2">Overdue Action Items</SectionLabel>
                <ul className="space-y-2">
                  {overdueActions.map((a) => (
                    <li
                      key={a.id}
                      className="flex items-start justify-between gap-3 text-sm border-l-2 border-red-400 pl-3 py-1"
                    >
                      <div className="min-w-0">
                        <p className="font-medium text-esm-black">{a.description}</p>
                        <p className="text-xs text-esm-muted mt-0.5">
                          {a.owner && <span>{a.owner} · </span>}
                          {a.dueDate && (
                            <span>
                              Due{" "}
                              {parseLocalDate(a.dueDate).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                              })}
                            </span>
                          )}
                        </p>
                      </div>
                      <Badge variant="danger" className="shrink-0 text-[10px] font-bold tracking-wide uppercase">
                        Overdue
                      </Badge>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </Card>
        </CollapsibleSection>
      )}

      {/* ── Section 4: Milestone Completion by Phase ── */}
      <CollapsibleSection id="phase-progress" title="Milestone Progress by Phase" className="mb-5">
        <Card>
          <div className="space-y-4">
            {phases.map(({ phase, complete, total, percent }) => (
              <div key={phase}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-esm-black">{phase}</span>
                  <span className="text-xs text-esm-muted">
                    {complete}/{total} complete
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-gray-100 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${percent}%`,
                      backgroundColor: "var(--hub-accent, #F4333F)",
                    }}
                  />
                </div>
              </div>
            ))}
            {phases.length === 0 && (
              <p className="text-sm text-esm-muted">No milestones available.</p>
            )}
          </div>
        </Card>
      </CollapsibleSection>

      {/* ── Section 5: What's Left Summary ── */}
      <CollapsibleSection id="whats-left" title="What&rsquo;s Left" className="mb-5">
        <Card>
          <ul className="divide-y divide-gray-100">
            <li className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
              <div className="flex items-center gap-2">
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: remainingMilestones > 0 ? "#F59E0B" : "#22C55E" }}
                />
                <span className="text-sm text-esm-black">Milestones remaining</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-esm-black">{remainingMilestones}</span>
                <a
                  href="/hub/milestones"
                  className="text-xs font-medium hover:underline"
                  style={{ color: "var(--hub-accent, #F4333F)" }}
                >
                  View
                </a>
              </div>
            </li>

            <li className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
              <div className="flex items-center gap-2">
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: openActionItems > 0 ? "#F59E0B" : "#22C55E" }}
                />
                <span className="text-sm text-esm-black">Action items open</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-esm-black">{openActionItems}</span>
                <a
                  href="/hub/action-items"
                  className="text-xs font-medium hover:underline"
                  style={{ color: "var(--hub-accent, #F4333F)" }}
                >
                  View
                </a>
              </div>
            </li>

            {unresolvedRaid > 0 && (
              <li className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                <div className="flex items-center gap-2">
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: "#F59E0B" }}
                  />
                  <span className="text-sm text-esm-black">RAID items unresolved</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-esm-black">{unresolvedRaid}</span>
                  <a
                    href="/hub/raid-log"
                    className="text-xs font-medium hover:underline"
                    style={{ color: "var(--hub-accent, #F4333F)" }}
                  >
                    View
                  </a>
                </div>
              </li>
            )}
          </ul>
        </Card>
      </CollapsibleSection>
    </>
  );
}
