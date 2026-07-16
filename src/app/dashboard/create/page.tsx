"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import DashboardBreadcrumb from "@/components/dashboard/DashboardBreadcrumb";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui";

const PHASES = ["intake", "implementation", "configuration", "testing", "training", "go-live"] as const;
const STATUSES = ["ON_TRACK", "AT_RISK", "OFF_TRACK"] as const;

export default function CreateProjectPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    customerName: "",
    projectName: "",
    products: "",
    scEmail: "",
    saEmail: "",
    pmEmail: "",
    goLiveDate: "",
    currentPhase: "intake",
    status: "ON_TRACK",
    password: "",
  });

  function update(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (error) setError("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          products: form.products.split(",").map((p) => p.trim()).filter(Boolean),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to create project");
        setLoading(false);
        return;
      }

      router.push("/dashboard");
    } catch {
      setError("An unexpected error occurred");
      setLoading(false);
    }
  }

  const inputClass = "w-full border border-esm-border rounded px-3 py-1.5 text-sm";

  return (
    <>
      <DashboardBreadcrumb items={[{ label: "New Project" }]} />
      <div className="max-w-3xl mx-auto px-6 py-6">
        <h1 className="text-xl font-semibold text-esm-black mb-1">Create New Project</h1>
        <p className="text-sm text-esm-grey mb-6">
          Set up a new customer implementation project.
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Card padding="md">
            <h2 className="text-sm font-semibold text-esm-black mb-4">Project Details</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-esm-black mb-1">
                  Customer Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  className={inputClass}
                  value={form.customerName}
                  onChange={(e) => update("customerName", e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-esm-black mb-1">
                  Project Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  className={inputClass}
                  value={form.projectName}
                  onChange={(e) => update("projectName", e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-esm-black mb-1">
                  Products <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="ESM Purchase, ESM Consumer Role"
                  className={inputClass}
                  value={form.products}
                  onChange={(e) => update("products", e.target.value)}
                />
                <p className="text-xs text-esm-grey mt-1">Comma-separated list of products</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-esm-black mb-1">
                  Go-Live Date
                </label>
                <input
                  type="date"
                  className={inputClass}
                  value={form.goLiveDate}
                  onChange={(e) => update("goLiveDate", e.target.value)}
                />
              </div>
            </div>
          </Card>

          <Card padding="md">
            <h2 className="text-sm font-semibold text-esm-black mb-4">Team Assignments</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-esm-black mb-1">
                  SC Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  className={inputClass}
                  value={form.scEmail}
                  onChange={(e) => update("scEmail", e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-esm-black mb-1">
                  SA Email
                </label>
                <input
                  type="email"
                  className={inputClass}
                  value={form.saEmail}
                  onChange={(e) => update("saEmail", e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-esm-black mb-1">
                  PM Email
                </label>
                <input
                  type="email"
                  className={inputClass}
                  value={form.pmEmail}
                  onChange={(e) => update("pmEmail", e.target.value)}
                />
              </div>
            </div>
          </Card>

          <Card padding="md">
            <h2 className="text-sm font-semibold text-esm-black mb-4">Status & Access</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-esm-black mb-1">
                  Current Phase <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  className={inputClass}
                  value={form.currentPhase}
                  onChange={(e) => update("currentPhase", e.target.value)}
                >
                  {PHASES.map((phase) => (
                    <option key={phase} value={phase}>
                      {phase.charAt(0).toUpperCase() + phase.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-esm-black mb-1">
                  Status <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  className={inputClass}
                  value={form.status}
                  onChange={(e) => update("status", e.target.value)}
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s.replace(/_/g, " ")}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-esm-black mb-1">
                  Hub Password <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  className={inputClass}
                  value={form.password}
                  onChange={(e) => update("password", e.target.value)}
                />
                <p className="text-xs text-esm-grey mt-1">Password for customer portal access</p>
              </div>
            </div>
          </Card>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded px-4 py-3">
              {error}
            </div>
          )}

          <div className="flex items-center gap-3">
            <Button variant="primary" size="md" type="submit" disabled={loading}>
              {loading ? "Creating..." : "Create Project"}
            </Button>
            <Button
              variant="secondary"
              size="md"
              type="button"
              onClick={() => router.push("/dashboard")}
            >
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </>
  );
}
