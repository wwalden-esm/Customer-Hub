"use client";

import { useState } from "react";

export default function PreviewCustomerSiteButton({ projectId }: { projectId: string }) {
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/preview-session`, {
        method: "POST",
      });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "Failed to create preview session");
        return;
      }
      window.open("/hub", "_blank");
    } catch {
      alert("Failed to create preview session");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className="block w-full text-center bg-emerald-600 text-white text-sm font-medium py-2 rounded hover:opacity-90 transition-opacity disabled:opacity-50"
    >
      {loading ? "Opening..." : "Preview Customer Site"}
    </button>
  );
}
