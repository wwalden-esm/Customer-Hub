"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface NavItem {
  href: string;
  label: string;
}

export default function Breadcrumbs({ items }: { items: NavItem[] }) {
  const pathname = usePathname();

  if (pathname === "/hub") return null;

  const current = items.find((item) =>
    item.href === "/hub" ? false : pathname.startsWith(item.href),
  );

  if (!current) return null;

  return (
    <nav aria-label="Breadcrumb" className="max-w-7xl mx-auto px-4 sm:px-6 pt-3 sm:pt-4">
      <ol className="flex items-center gap-1.5 text-sm text-esm-grey">
        <li>
          <Link href="/hub" className="hover:text-esm-black transition-colors">
            Dashboard
          </Link>
        </li>
        <li aria-hidden="true">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </li>
        <li>
          <span className="text-esm-black font-medium" aria-current="page">
            {current.label}
          </span>
        </li>
      </ol>
    </nav>
  );
}
