import { SectionLabel, Card } from "@/components/ui";

export default function TrainingProgress({ completed, total }: { completed: number; total: number }) {
  if (total === 0) return null;

  const pct = Math.round((completed / total) * 100);

  return (
    <section aria-labelledby="training-heading">
      <Card padding="md">
      <SectionLabel className="mb-3"><h2 id="training-heading">
        Training Progress
      </h2></SectionLabel>
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <div className="w-full h-2 bg-[#E2E0E1] rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${pct}%`,
                backgroundColor: pct === 100 ? "#22c55e" : "var(--hub-accent, #F4333F)",
              }}
            />
          </div>
        </div>
        <span className="text-sm font-bold text-esm-black tabular-nums shrink-0">{pct}%</span>
      </div>
      <p className="text-xs text-esm-muted mt-2">
        {completed} of {total} training milestone{total !== 1 ? "s" : ""} complete
      </p>
      </Card>
    </section>
  );
}
