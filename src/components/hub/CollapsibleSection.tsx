"use client";

import { useState, useEffect, type ReactNode } from "react";

const STORAGE_KEY = "hub-collapsed-sections";

function getCollapsed(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

function persist(collapsed: Set<string>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(collapsed)));
  } catch { /* quota exceeded — ignore */ }
}

interface CollapsibleSectionProps {
  id: string;
  title: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
  defaultExpanded?: boolean;
}

export default function CollapsibleSection({ id, title, subtitle, children, className, defaultExpanded }: CollapsibleSectionProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const stored = getCollapsed();
    if (defaultExpanded && !stored.has(id)) {
      setIsCollapsed(false);
    } else {
      setIsCollapsed(stored.has(id));
    }
    setHydrated(true);
  }, [id, defaultExpanded]);

  function toggle() {
    setIsCollapsed((prev) => {
      const next = !prev;
      const set = getCollapsed();
      if (next) set.add(id);
      else set.delete(id);
      persist(set);
      return next;
    });
  }

  return (
    <div className={className}>
      <button
        type="button"
        onClick={toggle}
        className="w-full flex items-center justify-between py-1.5 mb-1 group"
        aria-expanded={!isCollapsed}
        aria-controls={`section-${id}`}
      >
        <span className="text-label font-extrabold tracking-[0.09em] uppercase text-esm-grey">
          {title}
        </span>
        {subtitle && (
          <span className="text-xs font-normal normal-case tracking-normal text-esm-muted ml-3">
            {subtitle}
          </span>
        )}
        <svg
          className={`w-4 h-4 text-esm-muted transition-transform duration-200 group-hover:text-esm-grey ${
            isCollapsed ? "-rotate-90" : ""
          }`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      <div
        id={`section-${id}`}
        className={`transition-all duration-200 overflow-hidden ${
          hydrated && isCollapsed ? "max-h-0 opacity-0" : "max-h-[5000px] opacity-100"
        }`}
      >
        {children}
      </div>
    </div>
  );
}
