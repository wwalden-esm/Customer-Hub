import { SectionLabel, Card } from "@/components/ui";

const STATUS_COLORS: Record<string, string> = {
  ON_TRACK: "#22c55e",
  AT_RISK: "#eab308",
  OFF_TRACK: "#ef4444",
};

interface Props {
  history: Array<{ week: string; status: "ON_TRACK" | "AT_RISK" | "OFF_TRACK" }>;
  currentStatus: "ON_TRACK" | "AT_RISK" | "OFF_TRACK";
}

export default function HealthTrend({ history, currentStatus }: Props) {
  if (history.length < 2) return null;

  const dotSize = 10;
  const gap = 6;

  return (
    <section aria-labelledby="health-trend-heading">
      <Card padding="md">
      <SectionLabel className="mb-3"><h2 id="health-trend-heading">
        Health Trend
      </h2></SectionLabel>
      <div className="flex items-center gap-1 mb-2">
        {history.map((h, i) => (
          <div key={i} className="flex flex-col items-center" style={{ gap: `${gap}px` }}>
            <div
              className="rounded-full"
              style={{
                width: dotSize,
                height: dotSize,
                backgroundColor: STATUS_COLORS[h.status] ?? STATUS_COLORS.ON_TRACK,
              }}
              title={`${h.week}: ${h.status.replace(/_/g, " ")}`}
            />
          </div>
        ))}
      </div>
      <div className="flex justify-between text-[10px] text-esm-muted">
        <span>{history[0].week}</span>
        <span>{history[history.length - 1].week}</span>
      </div>
      <div className="mt-3 flex items-center gap-3 text-[10px] text-esm-muted">
        {(["ON_TRACK", "AT_RISK", "OFF_TRACK"] as const).map((s) => {
          const count = history.filter((h) => h.status === s).length;
          if (count === 0) return null;
          return (
            <span key={s} className="flex items-center gap-1">
              <span className="rounded-full inline-block" style={{ width: 6, height: 6, backgroundColor: STATUS_COLORS[s] }} />
              {s.replace(/_/g, " ").toLowerCase()} ({count}w)
            </span>
          );
        })}
      </div>
      </Card>
    </section>
  );
}
