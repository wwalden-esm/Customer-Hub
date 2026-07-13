"use client";

import { useState } from "react";

interface GoLiveBannerProps {
  daysToGoLive: number;
  goLiveDate: string;
}

export default function GoLiveBanner({ daysToGoLive, goLiveDate }: GoLiveBannerProps) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed || daysToGoLive > 30) return null;

  const formatted = new Date(goLiveDate + "T00:00:00").toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const urgent = daysToGoLive <= 7;
  const bg = urgent ? "bg-red-600" : "bg-amber-500";

  return (
    <div className={`${bg} text-white px-4 py-2 text-center text-sm font-medium relative`} role="alert">
      <span>
        {urgent ? "🚨 " : "📅 "}
        <strong>{daysToGoLive} day{daysToGoLive !== 1 ? "s" : ""}</strong> until go-live ({formatted})
      </span>
      <button
        onClick={() => setDismissed(true)}
        className="absolute right-3 top-1/2 -translate-y-1/2 opacity-70 hover:opacity-100"
        aria-label="Dismiss banner"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}
