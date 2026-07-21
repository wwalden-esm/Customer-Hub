"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function KeyboardShortcuts() {
  const router = useRouter();
  const [showHelp, setShowHelp] = useState(false);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        router.push("/dashboard/analytics");
      }

      if (e.key === "?" && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        setShowHelp((prev) => !prev);
      }

      if (e.key === "Escape" && showHelp) {
        setShowHelp(false);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [router, showHelp]);

  if (!showHelp) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowHelp(false)}>
      <div
        className="bg-white dark:bg-neutral-800 rounded-lg shadow-xl p-6 max-w-sm w-full mx-4 border border-esm-border dark:border-neutral-700"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Keyboard shortcuts"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-esm-black dark:text-neutral-100">Keyboard shortcuts</h2>
          <button onClick={() => setShowHelp(false)} className="text-esm-muted hover:text-esm-black dark:hover:text-white transition-colors" aria-label="Close">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="space-y-3 text-sm">
          {[
            ["Ctrl + K", "Go to analytics"],
            ["?", "Toggle this help"],
            ["Esc", "Close dialogs"],
          ].map(([key, desc]) => (
            <div key={key} className="flex items-center justify-between">
              <span className="text-esm-grey dark:text-neutral-400">{desc}</span>
              <kbd className="px-2 py-0.5 text-xs font-mono bg-esm-grey-light dark:bg-neutral-700 text-esm-black dark:text-neutral-200 rounded border border-esm-border dark:border-neutral-600">{key}</kbd>
            </div>
          ))}
        </div>
        <p className="text-xs text-esm-muted mt-4">Press ? anywhere to toggle</p>
      </div>
    </div>
  );
}
