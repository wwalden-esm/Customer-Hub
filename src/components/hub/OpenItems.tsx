import type { HubActionItem } from "@/types/hub";

function fmt(d: string) {
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function daysUntil(d: string): number {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.ceil((new Date(d).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

const PRI_META = {
  high: { className: "text-esm-red bg-red-50 border-esm-red/25", label: "High" },
  medium: { className: "text-esm-grey bg-gray-100 border-esm-grey/25", label: "Medium" },
  low: { className: "text-[#9E9B9E] bg-gray-50 border-[#E2E0E1]", label: "Low" },
};

export default function OpenItems({ items }: { items: HubActionItem[] }) {
  return (
    <section className="bg-white border border-[#E2E0E1] rounded-sm overflow-hidden" aria-labelledby="open-items-heading">
      <div className="flex justify-between items-center px-5 py-3.5 border-b border-[#E2E0E1]">
        <h2 id="open-items-heading" className="text-[10px] font-extrabold text-esm-grey tracking-[0.09em] uppercase">
          Open Action Items
        </h2>
        <div
          className={`text-[11px] font-bold px-2.5 py-0.5 rounded-sm border ${
            items.length > 0
              ? "bg-red-50 text-esm-red border-esm-red/25"
              : "bg-gray-50 text-esm-grey border-[#E2E0E1]"
          }`}
          aria-label={`${items.length} open items`}
        >
          {items.length} open
        </div>
      </div>
      {items.length === 0 ? (
        <div className="p-9 text-center text-[#9E9B9E] text-sm">No open action items</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-50">
                {["Action Item", "Owner", "Due Date", "Priority"].map((h) => (
                  <th
                    key={h}
                    scope="col"
                    className="px-[18px] py-2.5 text-[10px] font-extrabold text-esm-grey tracking-wider uppercase text-left border-b border-[#E2E0E1]"
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
                    className={`${i < items.length - 1 ? "border-b border-[#E2E0E1]" : ""} ${
                      urgent || overdue ? "bg-red-50/30" : ""
                    }`}
                  >
                    <td className="px-[18px] py-3 text-sm text-esm-black leading-snug">
                      {item.description}
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
                      <span
                        className={`text-[10px] font-bold tracking-wide uppercase border px-2 py-0.5 rounded-sm ${pm.className}`}
                      >
                        {pm.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
