"use client";

import { useState, useEffect } from "react";

interface DataTimestampProps {
  timestamp: string;
}

export default function DataTimestamp({ timestamp }: DataTimestampProps) {
  const [relativeTime, setRelativeTime] = useState("");

  useEffect(() => {
    function update() {
      const diff = Date.now() - new Date(timestamp).getTime();
      const seconds = Math.floor(diff / 1000);
      if (seconds < 10) setRelativeTime("just now");
      else if (seconds < 60) setRelativeTime(`${seconds}s ago`);
      else if (seconds < 3600) setRelativeTime(`${Math.floor(seconds / 60)}m ago`);
      else setRelativeTime(`${Math.floor(seconds / 3600)}h ago`);
    }
    update();
    const id = setInterval(update, 10_000);
    return () => clearInterval(id);
  }, [timestamp]);

  if (!relativeTime) return null;

  return (
    <span className="text-[11px] text-esm-muted whitespace-nowrap">
      Data as of {relativeTime}
    </span>
  );
}
