import type { HubActionItem } from "@/types/hub";

function fmt(d: string) {
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function daysUntil(d: string): number {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.ceil((new Date(d).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

export default function CustomerActionItems({ items, contactName }: { items: HubActionItem[]; contactName?: string | null }) {
  if (items.length === 0) return null;

  const overdue = items.filter((a) => a.isOverdue);
  const upcoming = items.filter((a) => !a.isOverdue);

  return (
    <section
      className="bg-white border border-[#E2E0E1] rounded-sm overflow-hidden"
      style={{ borderLeftWidth: "4px", borderLeftColor: overdue.length > 0 ? "#F4333F" : "var(--hub-accent, #F4333F)" }}
      aria-labelledby="customer-actions-heading"
    >
      <div className="flex justify-between items-center px-5 py-3.5 border-b border-[#E2E0E1]">
        <h2 id="customer-actions-heading" className="text-[10px] font-extrabold text-esm-grey tracking-[0.09em] uppercase">
          Your Action Items
        </h2>
        <div
          className={`text-[11px] font-bold px-2.5 py-0.5 rounded-sm border ${
            overdue.length > 0
              ? "bg-red-50 text-esm-red border-esm-red/25"
              : "bg-amber-50 text-amber-700 border-amber-200"
          }`}
        >
          {items.length} item{items.length !== 1 ? "s" : ""} need{items.length === 1 ? "s" : ""} your attention
        </div>
      </div>
      <ul className="divide-y divide-gray-100">
        {[...overdue, ...upcoming].map((item) => {
          const days = item.dueDate ? daysUntil(item.dueDate) : null;
          const isOverdue = days !== null && days < 0;
          const isSoon = days !== null && days <= 3 && days >= 0;
          return (
            <li key={item.id} className={`px-5 py-3 flex items-start gap-3 ${isOverdue ? "bg-red-50/40" : ""}`}>
              <div
                className={`w-5 h-5 rounded-full border-2 shrink-0 mt-0.5 flex items-center justify-center ${
                  item.status === "done"
                    ? "border-emerald-500 bg-emerald-500"
                    : isOverdue
                      ? "border-esm-red"
                      : "border-[#E2E0E1]"
                }`}
              >
                {item.status === "done" && (
                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-esm-black leading-snug">{item.description}</p>
                <div className="flex items-center gap-2 mt-1">
                  {item.dueDate && (
                    <span className={`text-xs ${isOverdue ? "text-esm-red font-medium" : isSoon ? "text-amber-600" : "text-[#9E9B9E]"}`}>
                      {isOverdue ? `Overdue (${fmt(item.dueDate)})` : isSoon ? `Due ${fmt(item.dueDate)}` : `Due ${fmt(item.dueDate)}`}
                    </span>
                  )}
                  {item.owner && (
                    <>
                      <span className="text-[#E2E0E1]" aria-hidden="true">&middot;</span>
                      {contactName && item.owner.toLowerCase().includes(contactName.toLowerCase()) ? (
                        <span className="text-xs font-medium text-[var(--hub-accent,#1E3A5F)]">You</span>
                      ) : (
                        <span className="text-xs text-[#9E9B9E]">{item.owner}</span>
                      )}
                    </>
                  )}
                </div>
              </div>
              {item.priority === "high" && (
                <span className="text-[9px] font-bold tracking-wide uppercase text-esm-red bg-red-50 border border-esm-red/25 px-1.5 py-0.5 rounded-sm shrink-0">
                  High
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
