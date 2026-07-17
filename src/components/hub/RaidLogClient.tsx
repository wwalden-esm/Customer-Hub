"use client";

import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { parseLocalDate } from "@/lib/date-utils";
import { Badge, Card, useToast } from "@/components/ui";
import type { BadgeVariant } from "@/components/ui";

interface RaidItem {
  id: string;
  itemId: string;
  item: string;
  type: "Risk" | "Action" | "Issue" | "Decision";
  status: "New" | "In Progress" | "Blocked" | "Complete";
  priority: "High" | "Medium" | "Low";
  notes: string;
  assigned: string;
  targetDate: string | null;
}

interface PendingRaidItem {
  id: string;
  projectId: string;
  type: "Risk" | "Action" | "Issue" | "Decision";
  item: string;
  notes: string;
  priority: "High" | "Medium" | "Low";
  assigned: string;
  submittedBy: string;
  submittedAt: string;
  review_status: "submitted" | "approved" | "changes_requested";
  review_notes?: string;
  reviewedBy?: string;
  reviewedAt?: string;
}

const TYPE_VARIANTS: Record<string, BadgeVariant> = {
  Risk: "warning",
  Action: "info",
  Issue: "danger",
  Decision: "accent",
};

const STATUS_VARIANTS: Record<string, BadgeVariant> = {
  New: "neutral",
  "In Progress": "info",
  Blocked: "danger",
  Complete: "success",
};

const PRIORITY_VARIANTS: Record<string, BadgeVariant> = {
  High: "danger",
  Medium: "warning",
  Low: "neutral",
};

const TYPES = ["All", "Risk", "Action", "Issue", "Decision"] as const;
const STATUSES = ["All", "New", "In Progress", "Blocked", "Complete"] as const;
const OWNER_FILTERS = ["All", "My Items", "ESM Items"] as const;

const REVIEW_STATUS_LABELS: Record<string, string> = {
  submitted: "Pending Approval",
  changes_requested: "Changes Requested",
};

const REVIEW_STATUS_VARIANTS: Record<string, BadgeVariant> = {
  submitted: "warning",
  changes_requested: "danger",
};

interface RaidLogClientProps {
  items: RaidItem[];
  projectId: string;
  contactNames?: string[];
  esmTeamNames?: string[];
  sessionName?: string | null;
  pendingItems?: PendingRaidItem[];
  canSubmit?: boolean;
}

function PrintRaidButton() {
  return (
    <button
      onClick={() => window.print()}
      className="no-print inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-esm-grey bg-gray-100 rounded-card hover:bg-gray-200 transition-colors"
    >
      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
      </svg>
      Print
    </button>
  );
}

export default function RaidLogClient({ items, projectId, contactNames = [], esmTeamNames = [], sessionName, pendingItems = [], canSubmit = true }: RaidLogClientProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [typeFilter, setTypeFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [ownerFilter, setOwnerFilter] = useState("All");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const submitTriggerRef = useRef<HTMLButtonElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  const closeModal = useCallback(() => {
    setShowSubmitModal(false);
    submitTriggerRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!showSubmitModal) return;

    const modal = modalRef.current;
    if (!modal) return;

    const focusableSelector = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
    const focusableElements = modal.querySelectorAll<HTMLElement>(focusableSelector);
    const firstFocusable = focusableElements[0];
    const lastFocusable = focusableElements[focusableElements.length - 1];

    firstFocusable?.focus();

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        closeModal();
        return;
      }
      if (e.key === "Tab") {
        if (e.shiftKey) {
          if (document.activeElement === firstFocusable) {
            e.preventDefault();
            lastFocusable?.focus();
          }
        } else {
          if (document.activeElement === lastFocusable) {
            e.preventDefault();
            firstFocusable?.focus();
          }
        }
      }
    }

    modal.addEventListener("keydown", handleKeyDown);
    return () => modal.removeEventListener("keydown", handleKeyDown);
  }, [showSubmitModal, closeModal]);

  const filtered = useMemo(() => {
    return items.filter((item) => {
      if (typeFilter !== "All" && item.type !== typeFilter) return false;
      if (statusFilter !== "All" && item.status !== statusFilter) return false;
      if (ownerFilter !== "All") {
        const assignedLower = (item.assigned || "").toLowerCase();
        if (ownerFilter === "My Items") {
          // Match against customer contact names and session name
          const customerNames = [...contactNames];
          if (sessionName) customerNames.push(sessionName);
          const isCustomerOwned = customerNames.some((name) =>
            assignedLower.includes(name.toLowerCase())
          );
          if (!isCustomerOwned) return false;
        } else if (ownerFilter === "ESM Items") {
          const isEsmOwned = esmTeamNames.some((name) =>
            assignedLower.includes(name.toLowerCase())
          ) || assignedLower.includes("esm");
          if (!isEsmOwned) return false;
        }
      }
      return true;
    });
  }, [items, typeFilter, statusFilter, ownerFilter, contactNames, esmTeamNames, sessionName]);

  const counts = useMemo(() => {
    const c = { Risk: 0, Action: 0, Issue: 0, Decision: 0, open: 0 };
    for (const item of items) {
      c[item.type]++;
      if (item.status !== "Complete") c.open++;
    }
    return c;
  }, [items]);

  const toggle = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  async function handleSubmitRaid(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    const form = e.currentTarget;
    const formData = new FormData(form);
    const payload = {
      type: formData.get("type") as string,
      item: formData.get("title") as string,
      notes: formData.get("description") as string,
      priority: formData.get("priority") as string,
      assigned: formData.get("suggestedOwner") as string,
    };

    try {
      const res = await fetch(`/api/projects/${projectId}/raid-log`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to submit");
      }
      toast(`${payload.type} submitted for approval.`, "success");
      closeModal();
      router.refresh();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed to submit item", "error");
    } finally {
      setSubmitting(false);
    }
  }

  if (items.length === 0) {
    return (
      <Card padding="sm" className="!px-6 !py-8 text-center">
        <svg className="w-10 h-10 mx-auto text-slate-300 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z" />
        </svg>
        <p className="text-sm text-slate-500">No RAID log items yet.</p>
        <p className="text-xs text-esm-muted mt-1">Risks, actions, issues, and decisions will appear here as they are logged.</p>
      </Card>
    );
  }

  return (
    <>
      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-5" role="group" aria-label="RAID log summary">
        <Card padding="sm" className="!px-4 !py-3 text-center">
          <p className="text-2xl font-semibold text-esm-black">{counts.open}</p>
          <p className="text-xs text-esm-grey">Open</p>
        </Card>
        {(["Risk", "Action", "Issue", "Decision"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTypeFilter(typeFilter === t ? "All" : t)}
            aria-pressed={typeFilter === t}
            className={`rounded-card border px-4 py-3 text-center transition-colors ${
              typeFilter === t ? "border-[var(--hub-accent)] bg-red-50" : "border-esm-border bg-white hover:border-esm-border"
            }`}
            style={typeFilter === t ? { borderColor: "var(--hub-accent)" } : undefined}
          >
            <p className="text-2xl font-semibold text-esm-black">{counts[t]}</p>
            <p className="text-xs text-esm-grey">{counts[t] === 1 ? t : `${t}s`}</p>
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4 mb-4" role="group" aria-label="Filters">
        {(contactNames.length > 0 || esmTeamNames.length > 0) && (
          <fieldset className="flex items-center gap-2">
            <legend className="text-[10px] font-extrabold text-esm-grey tracking-[0.09em] uppercase">Owner</legend>
            <div className="flex gap-1" role="radiogroup" aria-label="Filter by owner">
              {OWNER_FILTERS.map((o) => (
                <button
                  key={o}
                  onClick={() => setOwnerFilter(o)}
                  role="radio"
                  aria-checked={ownerFilter === o}
                  className={`px-2.5 py-1 text-xs font-medium rounded-full transition-colors ${
                    ownerFilter === o
                      ? "bg-esm-black text-white"
                      : "bg-gray-100 text-esm-grey hover:bg-gray-200"
                  }`}
                >
                  {o}
                </button>
              ))}
            </div>
          </fieldset>
        )}
        <fieldset className="flex items-center gap-2">
          <legend className="text-[10px] font-extrabold text-esm-grey tracking-[0.09em] uppercase">Type</legend>
          <div className="flex gap-1" role="radiogroup" aria-label="Filter by type">
            {TYPES.map((t) => (
              <button
                key={t}
                onClick={() => setTypeFilter(t)}
                role="radio"
                aria-checked={typeFilter === t}
                className={`px-2.5 py-1 text-xs font-medium rounded-full transition-colors ${
                  typeFilter === t
                    ? "bg-esm-black text-white"
                    : "bg-gray-100 text-esm-grey hover:bg-gray-200"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </fieldset>
        <fieldset className="flex items-center gap-2">
          <legend className="text-[10px] font-extrabold text-esm-grey tracking-[0.09em] uppercase">Status</legend>
          <div className="flex gap-1" role="radiogroup" aria-label="Filter by status">
            {STATUSES.map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                role="radio"
                aria-checked={statusFilter === s}
                className={`px-2.5 py-1 text-xs font-medium rounded-full transition-colors ${
                  statusFilter === s
                    ? "bg-esm-black text-white"
                    : "bg-gray-100 text-esm-grey hover:bg-gray-200"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </fieldset>
        <div className="ml-auto flex items-center gap-2">
          {canSubmit && (
            <button
              ref={submitTriggerRef}
              onClick={() => setShowSubmitModal(true)}
              className="no-print inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white rounded-card transition-colors"
              style={{ backgroundColor: "var(--hub-accent, #F4333F)" }}
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Submit Risk / Issue
            </button>
          )}
          <PrintRaidButton />
        </div>
      </div>

      {/* Pending items */}
      {pendingItems.length > 0 && (
        <div className="mb-5">
          <h2 className="text-sm font-semibold text-esm-black mb-2">Pending Submissions</h2>
          <Card padding="sm" className="!p-0 divide-y divide-esm-border">
            {pendingItems.map((pi) => (
              <div key={pi.id} className="px-5 py-4">
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant={TYPE_VARIANTS[pi.type]} pill>
                        {pi.type}
                      </Badge>
                      <Badge variant={REVIEW_STATUS_VARIANTS[pi.review_status]} pill>
                        {REVIEW_STATUS_LABELS[pi.review_status]}
                      </Badge>
                      <Badge variant={PRIORITY_VARIANTS[pi.priority]} pill>
                        {pi.priority}
                      </Badge>
                    </div>
                    <p className="text-sm font-medium text-esm-black mt-1.5">{pi.item}</p>
                    {pi.notes && (
                      <p className="text-xs text-esm-grey mt-1">{pi.notes}</p>
                    )}
                    <div className="flex gap-4 mt-1 text-xs text-esm-grey">
                      <span>Submitted {new Date(pi.submittedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                      {pi.assigned && <span>Suggested owner: {pi.assigned}</span>}
                    </div>
                    {pi.review_status === "changes_requested" && pi.review_notes && (
                      <div className="mt-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-card">
                        <p className="text-xs font-medium text-amber-800">Changes Requested</p>
                        <p className="text-xs text-amber-700 mt-0.5">{pi.review_notes}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </Card>
        </div>
      )}

      {/* Items list */}
      <Card padding="sm" className="!p-0 divide-y divide-esm-border">
        {filtered.length === 0 ? (
          <div className="px-5 py-6 text-center text-sm text-slate-500">
            No items match the selected filters.
          </div>
        ) : (
          filtered.map((item) => {
            const isExpanded = expanded.has(item.id);
            const isOverdue = item.targetDate && item.status !== "Complete"
              && parseLocalDate(item.targetDate) < new Date();
            const contentId = `raid-detail-${item.id}`;

            return (
              <div key={item.id} className="px-5 py-4">
                <button
                  onClick={() => toggle(item.id)}
                  aria-expanded={isExpanded}
                  aria-controls={item.notes ? contentId : undefined}
                  className="w-full text-left flex items-start gap-3"
                >
                  <svg
                    className={`w-4 h-4 text-esm-muted mt-0.5 shrink-0 transition-transform ${isExpanded ? "rotate-90" : ""}`}
                    fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant={TYPE_VARIANTS[item.type]} pill>
                        {item.type}
                      </Badge>
                      <Badge variant={STATUS_VARIANTS[item.status]} pill>
                        {item.status}
                      </Badge>
                      <Badge variant={PRIORITY_VARIANTS[item.priority]} pill>
                        {item.priority}
                      </Badge>
                      {isOverdue && (
                        <Badge variant="danger" pill>
                          Overdue
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm font-medium text-esm-black mt-1.5">{item.item}</p>
                    <div className="flex gap-4 mt-1 text-xs text-esm-grey">
                      {item.assigned && <span>Assigned: {item.assigned}</span>}
                      {item.targetDate && (
                        <span className={isOverdue ? "text-red-600 font-medium" : ""}>
                          Due: {parseLocalDate(item.targetDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                        </span>
                      )}
                      {item.itemId && <span>ID: {item.itemId}</span>}
                    </div>
                  </div>
                </button>
                {isExpanded && item.notes && (
                  <div id={contentId} className="ml-7 mt-3 pl-4 border-l-2 border-esm-border">
                    <p className="text-[10px] font-extrabold text-esm-grey tracking-[0.09em] uppercase mb-1">Notes</p>
                    <p className="text-sm text-esm-black whitespace-pre-wrap">{item.notes}</p>
                  </div>
                )}
              </div>
            );
          })
        )}
      </Card>

      <p className="text-xs text-esm-muted mt-3" aria-live="polite">
        Showing {filtered.length} of {items.length} items
      </p>

      {/* Submit RAID Item Modal */}
      {showSubmitModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="raid-submit-title"
          ref={modalRef}
        >
          <div className="bg-white rounded-card border border-esm-border shadow-lg w-full max-w-md mx-4 p-6">
            <h2 id="raid-submit-title" className="text-lg font-semibold text-esm-black mb-4">Submit Risk / Issue</h2>
            <form onSubmit={handleSubmitRaid} className="space-y-4">
              <div>
                <label htmlFor="raid-type" className="block text-xs font-medium text-esm-grey mb-1">Type</label>
                <select
                  id="raid-type"
                  name="type"
                  required
                  className="w-full rounded-card border border-esm-border px-3 py-2 text-sm text-esm-black focus:outline-none focus:ring-2 focus:ring-[var(--hub-accent,#F4333F)] focus:border-transparent"
                >
                  <option value="Risk">Risk</option>
                  <option value="Issue">Issue</option>
                  <option value="Action">Assumption</option>
                  <option value="Decision">Decision</option>
                </select>
              </div>
              <div>
                <label htmlFor="raid-title" className="block text-xs font-medium text-esm-grey mb-1">Title</label>
                <input
                  id="raid-title"
                  name="title"
                  type="text"
                  required
                  className="w-full rounded-card border border-esm-border px-3 py-2 text-sm text-esm-black focus:outline-none focus:ring-2 focus:ring-[var(--hub-accent,#F4333F)] focus:border-transparent"
                  placeholder="Brief summary of the risk or issue"
                />
              </div>
              <div>
                <label htmlFor="raid-description" className="block text-xs font-medium text-esm-grey mb-1">Description</label>
                <textarea
                  id="raid-description"
                  name="description"
                  rows={3}
                  className="w-full rounded-card border border-esm-border px-3 py-2 text-sm text-esm-black focus:outline-none focus:ring-2 focus:ring-[var(--hub-accent,#F4333F)] focus:border-transparent resize-none"
                  placeholder="Additional details (optional)"
                />
              </div>
              <div>
                <label htmlFor="raid-priority" className="block text-xs font-medium text-esm-grey mb-1">Priority</label>
                <select
                  id="raid-priority"
                  name="priority"
                  defaultValue="Medium"
                  className="w-full rounded-card border border-esm-border px-3 py-2 text-sm text-esm-black focus:outline-none focus:ring-2 focus:ring-[var(--hub-accent,#F4333F)] focus:border-transparent"
                >
                  <option value="High">High</option>
                  <option value="Medium">Medium</option>
                  <option value="Low">Low</option>
                </select>
              </div>
              <div>
                <label htmlFor="raid-owner" className="block text-xs font-medium text-esm-grey mb-1">Suggested Owner</label>
                <input
                  id="raid-owner"
                  name="suggestedOwner"
                  type="text"
                  className="w-full rounded-card border border-esm-border px-3 py-2 text-sm text-esm-black focus:outline-none focus:ring-2 focus:ring-[var(--hub-accent,#F4333F)] focus:border-transparent"
                  placeholder="Who should own this item? (optional)"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 text-sm font-medium text-esm-grey bg-gray-100 rounded-card hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 text-sm font-medium text-white rounded-card transition-colors disabled:opacity-50"
                  style={{ backgroundColor: "var(--hub-accent, #F4333F)" }}
                >
                  {submitting ? "Submitting..." : "Submit for Approval"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
