"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { EsmLogo } from "@/components/ui";

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
    <Card padding="lg" className="w-full max-w-md">
      <div className="flex items-center gap-3 mb-1">
        <EsmLogo size={48} variant="red" />
        <h1 className="text-2xl font-semibold text-esm-black">Implementation Customer Hub</h1>
      </div>
      <p className="text-sm text-esm-grey mt-1">ESM internal sign-in</p>
      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <div>
          <label htmlFor="login-email" className="block text-sm font-medium text-esm-black">Email</label>
          <Input
            id="login-email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            className="mt-1"
          />
        </div>
        <div>
          <label htmlFor="login-password" className="block text-sm font-medium text-esm-black">Password</label>
          <Input
            id="login-password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            className="mt-1"
          />
        </div>
        {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
        <Button
          type="submit"
          variant="primary"
          size="md"
          disabled={loading}
          className="w-full"
        >
          {loading ? "Signing in..." : "Sign in"}
        </Button>
      </form>
    </Card>
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
