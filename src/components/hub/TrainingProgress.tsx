export default function TrainingProgress({ completed, total }: { completed: number; total: number }) {
  if (total === 0) return null;

  const pct = Math.round((completed / total) * 100);

  return (
    <section className="bg-white border border-esm-border rounded-card p-5" aria-labelledby="training-heading">
      <h2 id="training-heading" className="text-[10px] font-extrabold text-esm-grey tracking-[0.09em] uppercase mb-3">
        Training Progress
      </h2>
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
    </section>
  );
}
