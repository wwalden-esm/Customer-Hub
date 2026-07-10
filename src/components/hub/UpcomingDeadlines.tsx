import Link from "next/link";
import type { HubDeadline } from "@/types/hub";

const SOURCE_LABELS: Record<string, { label: string; className: string }> = {
  action: { label: "Action Item", className: "bg-blue-50 text-blue-700 border-blue-200" },
  milestone: { label: "Milestone", className: "bg-purple-50 text-purple-700 border-purple-200" },
  meeting: { label: "Meeting", className: "bg-indigo-50 text-indigo-700 border-indigo-200" },
  deliverable: { label: "Deliverable", className: "bg-amber-50 text-amber-700 border-amber-200" },
};

function dueLabel(d: HubDeadline): string {
  if (d.daysUntil < 0) return `${Math.abs(d.daysUntil)}d overdue`;
  if (d.daysUntil === 0) return "Today";
  if (d.daysUntil === 1) return "Tomorrow";
  return `${d.daysUntil}d`;
}

function DeadlineRow({ d }: { d: HubDeadline }) {
  const src = SOURCE_LABELS[d.source] ?? SOURCE_LABELS.action;
  const isOverdue = d.daysUntil < 0;

  const content = (
    <>
      <span className={`text-xs font-bold tabular-nums w-16 shrink-0 ${isOverdue ? "text-esm-red" : d.daysUntil <= 1 ? "text-amber-600" : "text-esm-grey"}`}>
        {dueLabel(d)}
      </span>
      <span className="text-sm text-esm-black flex-1 min-w-0 truncate">{d.name}</span>
      <span className={`text-[9px] font-bold tracking-wide uppercase px-1.5 py-0.5 rounded-card border shrink-0 ${src.className}`}>
        {src.label}
      </span>
    </>
  );

  const className = `flex items-center gap-2 px-3 py-2 rounded-card transition-colors ${isOverdue ? "bg-red-50/50" : ""} ${d.href ? "hover:bg-slate-50 cursor-pointer" : ""}`;

  if (d.href) {
    return (
      <li>
        <Link href={d.href} className={className}>{content}</Link>
      </li>
    );
  }

  return <li className={className}>{content}</li>;
}

export default function UpcomingDeadlines({ deadlines }: { deadlines: HubDeadline[] }) {
  if (deadlines.length === 0) return null;

  const thisWeek = deadlines.filter((d) => d.daysUntil >= -7 && d.daysUntil <= 7);
  const nextWeek = deadlines.filter((d) => d.daysUntil > 7 && d.daysUntil <= 14);

  return (
    <section className="bg-white border border-esm-border rounded-card p-5" aria-labelledby="deadlines-heading">
      <h2 id="deadlines-heading" className="text-[10px] font-extrabold text-esm-grey tracking-[0.09em] uppercase mb-3">
        Upcoming Deadlines
      </h2>

      {thisWeek.length > 0 && (
        <div className="mb-3">
          <p className="text-[10px] font-medium text-esm-muted uppercase tracking-wider mb-1.5">This Week</p>
          <ul className="space-y-1.5">
            {thisWeek.map((d) => <DeadlineRow key={d.id} d={d} />)}
          </ul>
        </div>
      )}

      {nextWeek.length > 0 && (
        <div>
          <p className="text-[10px] font-medium text-esm-muted uppercase tracking-wider mb-1.5">Next Week</p>
          <ul className="space-y-1.5">
            {nextWeek.map((d) => <DeadlineRow key={d.id} d={d} />)}
          </ul>
        </div>
      )}
    </section>
  );
}
