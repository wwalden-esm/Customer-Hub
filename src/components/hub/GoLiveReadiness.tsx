import Link from "next/link";
import type { GoLiveReadinessItem } from "@/types/hub";

function ReadinessRow({ item }: { item: GoLiveReadinessItem }) {
  const content = (
    <>
      <div
        className={`rounded-full flex items-center justify-center shrink-0 ${
          item.done ? "bg-emerald-500" : "border-2 border-[#E2E0E1]"
        }`}
        style={{ width: 18, height: 18 }}
      >
        {item.done && (
          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        )}
      </div>
      <span className={`text-sm ${item.done ? "text-[#9E9B9E] line-through" : "text-esm-black"}`}>
        {item.label}
      </span>
      {item.detail && !item.done && (
        <span className="text-[10px] text-[#9E9B9E] ml-auto shrink-0">{item.detail}</span>
      )}
      {item.href && !item.done && (
        <svg className="w-3.5 h-3.5 text-[#9E9B9E] ml-auto shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      )}
    </>
  );

  if (item.href && !item.done) {
    return (
      <li>
        <Link href={item.href} className="flex items-center gap-2.5 py-1 px-1 -mx-1 rounded hover:bg-slate-50 transition-colors">
          {content}
        </Link>
      </li>
    );
  }

  return <li className="flex items-center gap-2.5">{content}</li>;
}

export default function GoLiveReadiness({ items, daysToGoLive }: { items: GoLiveReadinessItem[]; daysToGoLive: number | null }) {
  const done = items.filter((i) => i.done).length;
  const pct = items.length > 0 ? Math.round((done / items.length) * 100) : 0;

  return (
    <section className="bg-white border border-[#E2E0E1] rounded-sm p-5" aria-labelledby="readiness-heading">
      <div className="flex items-center justify-between mb-3">
        <h2 id="readiness-heading" className="text-[10px] font-extrabold text-esm-grey tracking-[0.09em] uppercase">
          Go-Live Readiness
        </h2>
        <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-sm border bg-gray-50 text-esm-grey border-[#E2E0E1]">
          {pct}%
        </span>
      </div>

      {daysToGoLive !== null && daysToGoLive <= 60 && (
        <div className={`text-xs font-medium mb-3 px-3 py-1.5 rounded-sm ${
          daysToGoLive <= 14 ? "bg-red-50 text-esm-red" : daysToGoLive <= 30 ? "bg-amber-50 text-amber-700" : "bg-blue-50 text-blue-700"
        }`}>
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
        {items.map((item, i) => <ReadinessRow key={i} item={item} />)}
      </ul>
    </section>
  );
}
