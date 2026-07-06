"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface NavItem {
  href: string;
  label: string;
}

export default function HubNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname();

  return (
    <nav className="bg-white border-b border-[#E2E0E1] overflow-x-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 flex gap-4 sm:gap-6">
        {items.map((item) => {
          const isActive =
            item.href === "/hub"
              ? pathname === "/hub"
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`hub-nav-link px-1 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                isActive
                  ? "text-esm-black border-b-[var(--hub-accent,#F4333F)]"
                  : "text-esm-grey hover:text-esm-black border-transparent"
              }`}
              style={isActive ? { borderBottomColor: "var(--hub-accent, #F4333F)" } : undefined}
              aria-current={isActive ? "page" : undefined}
            >
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
