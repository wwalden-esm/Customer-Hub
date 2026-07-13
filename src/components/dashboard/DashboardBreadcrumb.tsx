import Link from "next/link";

interface BreadcrumbItem {
  label: string;
  href?: string;
}

export default function DashboardBreadcrumb({ items }: { items: BreadcrumbItem[] }) {
  return (
    <div className="bg-white border-b border-esm-border">
      <div className="max-w-7xl mx-auto px-6 py-3">
        <nav className="flex items-center gap-1.5 text-sm" aria-label="Breadcrumb">
          <Link href="/dashboard" className="text-esm-grey hover:text-esm-black transition-colors">
            Projects
          </Link>
          {items.map((item, i) => (
            <span key={i} className="flex items-center gap-1.5">
              <svg className="w-3 h-3 text-esm-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
              {item.href ? (
                <Link href={item.href} className="text-esm-grey hover:text-esm-black transition-colors">
                  {item.label}
                </Link>
              ) : (
                <span className="text-esm-black font-medium">{item.label}</span>
              )}
            </span>
          ))}
        </nav>
      </div>
    </div>
  );
}
