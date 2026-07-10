import Link from "next/link";
import type { HubActionItem } from "@/types/hub";
import { parseLocalDate } from "@/lib/date-utils";
import { Badge, SectionLabel, Card, type BadgeVariant } from "@/components/ui";

function fmt(d: string) {
  return parseLocalDate(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function daysUntil(d: string): number {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.ceil((parseLocalDate(d).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

const PRI_META: Record<string, { variant: BadgeVariant; label: string }> = {
  high: { variant: "danger", label: "High" },
  medium: { variant: "neutral", label: "Medium" },
  low: { variant: "neutral", label: "Low" },
};

export default function OpenItems({ items }: { items: HubActionItem[] }) {
  return (
    <section aria-labelledby="open-items-heading">
      <Card padding="sm" className="!p-0 overflow-hidden">
      <div className="flex justify-between items-center px-5 py-3.5 border-b border-esm-border">
        <SectionLabel><h2 id="open-items-heading">
          Open Action Items
        </h2></SectionLabel>
        <Link
          href="/hub/raid-log"
          className={`text-[11px] font-bold px-2.5 py-0.5 rounded-card border hover:opacity-80 transition-opacity ${
            items.length > 0
              ? "bg-red-50 text-esm-red border-esm-red/25"
              : "bg-gray-50 text-esm-grey border-esm-border"
          }`}
          aria-label={`${items.length} open items — view RAID log`}
        >
          {items.length} open
        </Link>
      </div>
      {items.length === 0 ? (
        <div className="p-9 text-center text-esm-muted text-sm">No open action items</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-50">
                {["Action Item", "Owner", "Due Date", "Priority", ""].map((h) => (
                  <th
                    key={h || "link"}
                    scope="col"
                    className="px-[18px] py-2.5 text-[10px] font-extrabold text-esm-grey tracking-wider uppercase text-left border-b border-esm-border"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((item, i) => {
                const pm = PRI_META[(item.priority ?? "medium").toLowerCase() as keyof typeof PRI_META] ?? PRI_META.medium;
                const days = item.dueDate ? daysUntil(item.dueDate) : null;
                const urgent = days !== null && days <= 3 && days >= 0;
                const overdue = days !== null && days < 0;
                return (
                  <tr
                    key={item.id}
                    className={`group ${i < items.length - 1 ? "border-b border-esm-border" : ""} ${
                      urgent || overdue ? "bg-red-50/30" : "hover:bg-slate-50"
                    } transition-colors`}
                  >
                    <td className="px-[18px] py-3 text-sm text-esm-black leading-snug">
                      <Link href="/hub/raid-log" className="hover:underline">{item.description}</Link>
                    </td>
                    <td className="px-[18px] py-3 text-sm text-esm-grey whitespace-nowrap">
                      {item.owner || <span aria-label="Not assigned">—</span>}
                    </td>
                    <td className="px-[18px] py-3 whitespace-nowrap">
                      <span className={`text-sm ${urgent || overdue ? "text-esm-red" : "text-esm-black"}`}>
                        {item.dueDate ? fmt(item.dueDate) : <span aria-label="No due date">—</span>}
                        {overdue && (
                          <span className="ml-1.5 text-[9px] font-extrabold text-esm-red tracking-wide" aria-label="Overdue">
                            OVERDUE
                          </span>
                        )}
                        {urgent && !overdue && (
                          <span className="ml-1.5 text-[9px] font-extrabold text-esm-red tracking-wide" aria-label="Due soon">
                            SOON
                          </span>
                        )}
                      </span>
                    </td>
                    <td className="px-[18px] py-3">
                      <Badge variant={pm.variant} className="text-[10px] tracking-wide uppercase">
                        {pm.label}
                      </Badge>
                    </td>
                    <td className="px-[18px] py-3">
                      <svg className="w-3.5 h-3.5 text-esm-muted opacity-0 group-hover:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                      </svg>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      </Card>
    </section>
  );
}
