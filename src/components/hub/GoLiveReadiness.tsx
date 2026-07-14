"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import type { GoLiveReadinessItem, ChecklistConfirmationInfo } from "@/types/hub";
import { Badge, SectionLabel, Card } from "@/components/ui";

interface GoLiveReadinessProps {
  items: GoLiveReadinessItem[];
  daysToGoLive: number | null;
  projectId: string;
  confirmations: ChecklistConfirmationInfo[];
}

function ReadinessRow({
  item,
  confirmation,
  onConfirm,
  onRevoke,
  busy,
}: {
  item: GoLiveReadinessItem;
  confirmation?: ChecklistConfirmationInfo;
  onConfirm: (key: string) => void;
  onRevoke: (key: string) => void;
  busy: boolean;
}) {
  const isConfirmed = !!confirmation;
  const effectiveDone = item.done || isConfirmed;

  const checkCircle = (
    <div
      className={`rounded-full flex items-center justify-center shrink-0 ${
        effectiveDone ? "bg-emerald-500" : "border-2 border-esm-border"
      }`}
      style={{ width: 18, height: 18 }}
    >
      {effectiveDone && (
        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      )}
    </div>
  );

  const label = (
    <span className={`text-sm ${effectiveDone ? "text-esm-muted line-through" : "text-esm-black"}`}>
      {item.label}
    </span>
  );

  const detail = item.detail && !effectiveDone ? (
    <span className="text-[10px] text-esm-muted ml-auto shrink-0">{item.detail}</span>
  ) : null;

  const confirmButton = item.customerConfirmable && !item.done ? (
    isConfirmed ? (
      <button
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); onRevoke(item.key); }}
        disabled={busy}
        className="text-[10px] text-esm-muted hover:text-esm-red ml-auto shrink-0 transition-colors disabled:opacity-50"
        title={`Confirmed by ${confirmation.confirmedBy} on ${new Date(confirmation.confirmedAt).toLocaleDateString()}`}
      >
        Undo
      </button>
    ) : (
      <button
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); onConfirm(item.key); }}
        disabled={busy}
        className="text-[10px] font-medium ml-auto shrink-0 px-2 py-0.5 rounded-card transition-colors disabled:opacity-50 hover:opacity-80 text-white"
        style={{ backgroundColor: "var(--hub-accent, #F4333F)" }}
      >
        Confirm
      </button>
    )
  ) : null;

  const confirmedBadge = isConfirmed && !item.done ? (
    <span
      className="text-[10px] text-emerald-600 shrink-0"
      title={`Confirmed by ${confirmation.confirmedBy}`}
    >
      Confirmed
    </span>
  ) : null;

  if (item.href && !effectiveDone) {
    return (
      <li>
        <Link href={item.href} className="flex items-center gap-2.5 py-1 px-1 -mx-1 rounded hover:bg-slate-50 transition-colors">
          {checkCircle}
          {label}
          {detail}
          {confirmButton}
          {!confirmButton && (
            <svg className="w-3.5 h-3.5 text-esm-muted ml-auto shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          )}
        </Link>
      </li>
    );
  }

  return (
    <li className="flex items-center gap-2.5 py-1">
      {checkCircle}
      {label}
      {detail}
      {confirmedBadge}
      {confirmButton}
    </li>
  );
}

export default function GoLiveReadiness({
  items,
  daysToGoLive,
  projectId,
  confirmations: initialConfirmations,
}: GoLiveReadinessProps) {
  const [confirmations, setConfirmations] = useState<ChecklistConfirmationInfo[]>(initialConfirmations);
  const [busy, setBusy] = useState(false);

  const confirmMap = new Map(confirmations.map((c) => [c.itemKey, c]));

  const handleConfirm = useCallback(async (key: string) => {
    setBusy(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/checklist`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemKey: key }),
      });
      if (res.ok) {
        const data = await res.json();
        setConfirmations((prev) => [...prev.filter((c) => c.itemKey !== key), data]);
      }
    } finally {
      setBusy(false);
    }
  }, [projectId]);

  const handleRevoke = useCallback(async (key: string) => {
    setBusy(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/checklist`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemKey: key }),
      });
      if (res.ok) {
        setConfirmations((prev) => prev.filter((c) => c.itemKey !== key));
      }
    } finally {
      setBusy(false);
    }
  }, [projectId]);

  const done = items.filter((i) => i.done || confirmMap.has(i.key)).length;
  const pct = items.length > 0 ? Math.round((done / items.length) * 100) : 0;

  return (
    <section aria-labelledby="readiness-heading">
      <Card padding="md">
        <div className="flex items-center justify-between mb-3">
          <SectionLabel>
            <h2 id="readiness-heading">Go-Live Readiness</h2>
          </SectionLabel>
          <Badge variant="neutral" className="text-[11px] font-bold px-2.5">
            {pct}%
          </Badge>
        </div>

        {daysToGoLive !== null && daysToGoLive <= 60 && (
          <div
            className={`text-xs font-medium mb-3 px-3 py-1.5 rounded-card ${
              daysToGoLive <= 14
                ? "bg-red-50 text-esm-red"
                : daysToGoLive <= 30
                  ? "bg-amber-50 text-amber-700"
                  : "bg-blue-50 text-blue-700"
            }`}
          >
            {daysToGoLive} day{daysToGoLive !== 1 ? "s" : ""} until go-live
          </div>
        )}

        <div className="w-full h-1.5 bg-[#E2E0E1] rounded-full mb-4 overflow-hidden">
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${pct}%`,
              backgroundColor: pct === 100 ? "#22c55e" : "var(--hub-accent, #F4333F)",
            }}
          />
        </div>

        <ul className="space-y-2">
          {items.map((item) => (
            <ReadinessRow
              key={item.key}
              item={item}
              confirmation={confirmMap.get(item.key)}
              onConfirm={handleConfirm}
              onRevoke={handleRevoke}
              busy={busy}
            />
          ))}
        </ul>

        {pct === 100 && (
          <div className="mt-4 pt-3 border-t border-esm-border text-center">
            <p className="text-sm font-medium text-emerald-600">All readiness checks passed!</p>
          </div>
        )}
      </Card>
    </section>
  );
}
