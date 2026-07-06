import DonutRing from "./DonutRing";

function scoreColor(v: number): string {
  if (v >= 80) return "#2D2826";
  if (v >= 50) return "#686468";
  return "#F4333F";
}

interface MetricCardProps {
  label: string;
  value: string;
  sub: string;
  percent?: number;
  color?: string;
}

export default function MetricCard({ label, value, sub, percent, color }: MetricCardProps) {
  const c = color || (percent !== undefined ? scoreColor(percent) : undefined);

  return (
    <div
      className="bg-white border border-[#E2E0E1] rounded-sm p-[18px_20px] flex-1 min-w-[150px]"
      style={{ borderTopWidth: "3px", borderTopColor: c || "var(--hub-accent)" }}
    >
      <div className="text-[10px] text-esm-grey font-bold tracking-wider uppercase mb-3.5">
        {label}
      </div>
      <div className="flex items-center gap-3">
        {percent !== undefined && <DonutRing percent={percent} color={c || "#2D2826"} />}
        <div>
          <div
            className="font-bold leading-none tabular-nums"
            style={{ fontSize: percent !== undefined ? "26px" : "32px", color: c || "#2D2826" }}
          >
            {value}
          </div>
          <div className="text-[11px] text-[#9E9B9E] mt-1.5 leading-snug">{sub}</div>
        </div>
      </div>
    </div>
  );
}
