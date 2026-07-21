"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface NavItem {
  href: string;
  label: string;
}

export default function HubNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <nav className="bg-white dark:bg-neutral-800 border-b border-esm-border dark:border-neutral-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between sm:hidden py-2">
          <span className="text-sm font-medium text-esm-black dark:text-neutral-100">
            {items.find(
              (i) =>
                i.href === "/hub"
                  ? pathname === "/hub"
                  : pathname.startsWith(i.href),
            )?.label || "Menu"}
          </span>
          <button
            onClick={() => setOpen(!open)}
            className="p-1.5 rounded text-esm-grey hover:text-esm-black dark:text-neutral-400 dark:hover:text-neutral-100 transition-colors"
            aria-label={open ? "Close navigation" : "Open navigation"}
            aria-expanded={open}
          >
            {open ? (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>
        <div className={`${open ? "flex flex-col pb-2" : "hidden"} sm:flex sm:flex-row sm:gap-6 sm:overflow-x-auto`}>
          {items.map((item) => {
            const isActive =
              item.href === "/hub"
                ? pathname === "/hub"
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={`hub-nav-link px-1 py-2 sm:py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  isActive
                    ? "text-esm-black dark:text-white border-b-[var(--hub-accent,#F4333F)]"
                    : "text-esm-grey dark:text-neutral-400 hover:text-esm-black dark:hover:text-white border-transparent"
                }`}
                style={isActive ? { borderBottomColor: "var(--hub-accent, #F4333F)" } : undefined}
                aria-current={isActive ? "page" : undefined}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
