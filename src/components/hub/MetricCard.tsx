import DonutRing from "./DonutRing";
import { Card } from "@/components/ui";

function scoreColor(v: number): string {
  if (v >= 80) return "#2D2826";
  if (v >= 50) return "#686468";
  return "#F4333F";
}

interface MetricCardProps {
  label: string;
  value: string;
  sub?: string;
  percent?: number;
  color?: string;
  href?: string;
}

export default function MetricCard({ label, value, sub, percent, color, href }: MetricCardProps) {
  const c = color || (percent !== undefined ? scoreColor(percent) : undefined);

  const content = (
    <>
      <div className="text-[10px] text-esm-grey font-bold tracking-wider uppercase mb-3.5">
        {label}
        {href?.startsWith("http") && (
          <svg className="inline-block w-3 h-3 ml-1 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        )}
      </div>
      <div className="flex items-center gap-3">
        {percent !== undefined && <DonutRing percent={percent} color={c || "#2D2826"} />}
        <div>
          <div
            className="font-bold leading-tight tabular-nums"
            style={{ fontSize: percent !== undefined ? "26px" : value.length > 10 ? "18px" : "32px", color: c || "#2D2826" }}
          >
            {value}
          </div>
          {sub && <div className="text-[11px] text-esm-muted mt-1.5 leading-snug">{sub}</div>}
        </div>
      </div>
    </>
  );

  // Card only renders a <div>; when this needs to be a link (href), we can't use
  // Card directly (no polymorphic `as`), so the <a> case mirrors Card's own
  // className output (bg-white rounded-card border border-esm-border) manually.
  const linkClassName = "bg-white rounded-card border border-esm-border p-[18px_20px] flex-1 min-w-[150px] hover:shadow-md hover:border-esm-border-hover transition-shadow cursor-pointer block no-underline";

  if (href) {
    const isExternal = href.startsWith("http");
    return (
      <a
        href={href}
        {...(isExternal ? { target: "_blank", rel: "noopener noreferrer" } : {})}
        className={linkClassName}
        style={{ borderTopWidth: "3px", borderTopColor: c || "var(--hub-accent)" }}
      >
        {content}
      </a>
    );
  }

  return (
    <Card
      padding="sm"
      className="!p-[18px_20px] flex-1 min-w-[150px]"
      accent="top"
      accentColor={c || "var(--hub-accent)"}
    >
      {content}
    </Card>
  );
}
