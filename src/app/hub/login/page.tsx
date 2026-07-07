"use client";

import { Suspense, useState, useId } from "react";
import { useSearchParams } from "next/navigation";

function CustomerLoginForm() {
  const params = useSearchParams();
  const projectParam = params.get("project") || "";
  const [projectId, setProjectId] = useState(projectParam);
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const ids = { project: useId(), password: useId(), name: useId(), error: useId() };

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!projectId) {
      setError("Please enter a project ID.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/customer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, password, name: name || undefined }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Invalid credentials.");
        return;
      }
      window.location.href = "/hub";
    } catch {
      setError("Sign-in failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-md bg-white rounded-lg shadow p-8">
      <div className="flex items-center gap-3 mb-1">
        <div className="w-8 h-8 bg-esm-red rounded flex items-center justify-center text-white text-xs font-bold" aria-hidden="true">
          ESM
        </div>
        <h1 className="text-2xl font-semibold text-esm-black">Customer Hub</h1>
      </div>
      <p className="text-sm text-esm-grey mt-1">Sign in to your project portal</p>
      <form onSubmit={onSubmit} className="mt-6 space-y-4" aria-busy={loading} noValidate>
        <div>
          <label htmlFor={ids.project} className="block text-sm font-medium text-esm-black">Project ID</label>
          <input
            id={ids.project}
            type="text"
            required
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm"
            placeholder="demo-project"
            aria-describedby={error ? ids.error : undefined}
          />
        </div>
        <div>
          <label htmlFor={ids.password} className="block text-sm font-medium text-esm-black">Password</label>
          <input
            id={ids.password}
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm"
            autoComplete="current-password"
            aria-describedby={error ? ids.error : undefined}
          />
        </div>
        <div>
          <label htmlFor={ids.name} className="block text-sm font-medium text-esm-black">Your Name <span className="text-esm-grey">(optional)</span></label>
          <input
            id={ids.name}
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm"
            placeholder="Jane Smith"
          />
        </div>
        {error && (
          <div id={ids.error} role="alert" className="text-sm text-red-600">
            {error}
          </div>
        )}
        <button
          type="submit"
          disabled={loading}
          aria-busy={loading}
          className="w-full bg-esm-red hover:bg-esm-red-dark disabled:opacity-50 text-white font-medium py-2 rounded transition-colors"
        >
          {loading ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </div>
  );
}

export default function CustomerLoginPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-esm-grey-light">
      <Suspense>
        <CustomerLoginForm />
      </Suspense>
    </main>
  );
}
