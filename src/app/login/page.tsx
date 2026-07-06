"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";

function LoginForm() {
  const params = useSearchParams();
  const from = params.get("from") || "/dashboard";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const csrfRes = await fetch("/api/auth/csrf");
      const { csrfToken } = await csrfRes.json();
      const res = await fetch("/api/auth/callback/credentials", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ email, password, csrfToken }),
        redirect: "follow",
        credentials: "include",
      });
      const url = new URL(res.url);
      if (url.searchParams.has("error")) {
        setError("Invalid email or password.");
      } else {
        window.location.href = from;
      }
    } catch {
      setError("Sign-in failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-md bg-white rounded-lg shadow p-8">
      <div className="flex items-center gap-3 mb-1">
        <div className="w-8 h-8 bg-esm-red rounded flex items-center justify-center text-white text-xs font-bold">
          ESM
        </div>
        <h1 className="text-2xl font-semibold text-esm-black">Customer Hub</h1>
      </div>
      <p className="text-sm text-esm-grey mt-1">ESM internal sign-in</p>
      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-esm-black">Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-esm-red/50"
            autoComplete="email"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-esm-black">Password</label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-esm-red/50"
            autoComplete="current-password"
          />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-esm-red hover:bg-esm-red-dark disabled:opacity-50 text-white font-medium py-2 rounded transition-colors"
        >
          {loading ? "Signing in..." : "Sign in"}
        </button>
      </form>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-esm-grey-light">
      <Suspense>
        <LoginForm />
      </Suspense>
    </div>
  );
}
