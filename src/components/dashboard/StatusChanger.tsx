"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const STATUS_OPTIONS = [
  { value: "ON_TRACK", label: "On Track", color: "text-emerald-700 bg-emerald-50 border-emerald-200" },
  { value: "AT_RISK", label: "At Risk", color: "text-amber-700 bg-amber-50 border-amber-200" },
  { value: "OFF_TRACK", label: "Off Track", color: "text-red-700 bg-red-50 border-red-200" },
] as const;

export default function StatusChanger({
  projectId,
  currentStatus,
}: {
  projectId: string;
  currentStatus: string;
}) {
  const [updating, setUpdating] = useState(false);
  const router = useRouter();

  const current = STATUS_OPTIONS.find((o) => o.value === currentStatus) ?? STATUS_OPTIONS[0];

  async function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const newStatus = e.target.value;
    if (newStatus === currentStatus) return;
    setUpdating(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) router.refresh();
    } finally {
      setUpdating(false);
    }
  }

  return (
    <select
      value={currentStatus}
      onChange={handleChange}
      disabled={updating}
      className={`text-xs font-semibold px-2.5 py-1 rounded-full border cursor-pointer appearance-none pr-6 ${current.color} disabled:opacity-50`}
      style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`,
        backgroundRepeat: "no-repeat",
        backgroundPosition: "right 6px center",
      }}
      aria-label="Change project status"
    >
      {STATUS_OPTIONS.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}
