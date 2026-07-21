"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";

interface NavLink {
  href: string;
  label: string;
  exact?: boolean;
}

export default function DashboardNav({ links }: { links: NavLink[] }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const currentLabel = links.find((l) =>
    l.exact ? pathname === l.href : pathname.startsWith(l.href),
  )?.label || "Menu";

  return (
    <>
      <button
        onClick={() => setOpen(!open)}
        className="sm:hidden p-1.5 rounded text-white/80 hover:text-white hover:bg-white/10 transition-colors"
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

      <nav
        className={`${open ? "flex flex-col absolute top-full left-0 right-0 bg-esm-red border-t border-white/10 px-4 py-2 z-20 shadow-lg" : "hidden"} sm:flex sm:relative sm:flex-row sm:items-center sm:gap-1 sm:overflow-x-auto sm:min-w-0 sm:flex-1 sm:mx-2 sm:px-0 sm:py-0 sm:shadow-none sm:border-0`}
        aria-label="Main navigation"
      >
        {links.map((link) => {
          const isActive = link.exact ? pathname === link.href : pathname.startsWith(link.href);
          return (
            <a
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              aria-current={isActive ? "page" : undefined}
              className={`text-sm px-2.5 py-1.5 rounded-card transition-colors ${
                isActive
                  ? "text-white font-medium bg-white/20"
                  : "text-white/75 hover:text-white hover:bg-white/10"
              }`}
            >
              {link.label}
            </a>
          );
        })}
      </nav>
    </>
  );
}
