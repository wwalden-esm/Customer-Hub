"use client";

import { Suspense, useState, useId } from "react";
import { useSearchParams } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { EsmLogo } from "@/components/ui";

interface ContactOption {
  email: string;
  name: string;
  role?: string;
}

function CustomerLoginForm() {
  const params = useSearchParams();
  const projectParam = params.get("project") || "";
  const [projectId, setProjectId] = useState(projectParam);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [contacts, setContacts] = useState<ContactOption[] | null>(null);
  const [selectedContact, setSelectedContact] = useState<string>("");
  const [resetSent, setResetSent] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const ids = { project: useId(), password: useId(), contact: useId(), error: useId() };

  async function handleForgotPassword() {
    if (!projectId) {
      setError("Please enter your project ID first.");
      return;
    }
    setResetLoading(true);
    setError(null);
    try {
      await fetch("/api/auth/customer/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId }),
      });
      setResetSent(true);
    } catch {
      setError("Could not send reset request. Please contact your SC directly.");
    } finally {
      setResetLoading(false);
    }
  }

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
        body: JSON.stringify({ projectId, password }),
      });
      const data = await res.json();

      if (data.requireContactSelection) {
        setContacts(data.contacts);
        setLoading(false);
        return;
      }

      if (!res.ok) {
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

  async function onSelectContact(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedContact) {
      setError("Please select who you are.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/customer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, password, contactEmail: selectedContact }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Sign-in failed.");
        return;
      }
      window.location.href = "/hub";
    } catch {
      setError("Sign-in failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (contacts) {
    return (
      <Card padding="lg" className="w-full max-w-md">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-8 h-8 bg-esm-red rounded-card flex items-center justify-center text-white text-xs font-bold" aria-hidden="true">
            ESM
          </div>
          <h1 className="text-2xl font-semibold text-esm-black">Who are you?</h1>
        </div>
        <p className="text-sm text-esm-grey mt-1">Select your name to continue to the portal</p>
        <form onSubmit={onSelectContact} className="mt-6 space-y-3" aria-busy={loading}>
          {contacts.map((c) => (
            <label
              key={c.email}
              className={`flex items-center gap-3 p-3 rounded-card border cursor-pointer transition-colors ${
                selectedContact === c.email
                  ? "border-esm-red bg-red-50/30"
                  : "border-esm-border hover:border-esm-border-hover hover:bg-slate-50"
              }`}
            >
              <input
                type="radio"
                name="contact"
                value={c.email}
                checked={selectedContact === c.email}
                onChange={(e) => setSelectedContact(e.target.value)}
                className="w-4 h-4 text-esm-red focus:ring-esm-red"
              />
              <div>
                <p className="text-sm font-medium text-esm-black">{c.name}</p>
                {c.role && <p className="text-xs text-esm-grey">{c.role}</p>}
              </div>
            </label>
          ))}
          {error && (
            <div role="alert" className="text-sm text-red-600">{error}</div>
          )}
          <Button
            type="submit"
            variant="primary"
            size="md"
            disabled={loading || !selectedContact}
            className="w-full mt-2"
          >
            {loading ? "Signing in..." : "Continue"}
          </Button>
          <button
            type="button"
            onClick={() => { setContacts(null); setSelectedContact(""); setError(null); }}
            className="w-full text-sm text-esm-grey hover:text-esm-black py-1 transition-colors"
          >
            Back
          </button>
        </form>
      </Card>
    );
  }

  return (
    <Card padding="lg" className="w-full max-w-md">
      <div className="flex items-center gap-3 mb-1">
        <EsmLogo size={48} variant="red" />
        <h1 className="text-2xl font-semibold text-esm-black">Implementation Customer Hub</h1>
      </div>
      <p className="text-sm text-esm-grey mt-1">Sign in to your project portal</p>
      <form onSubmit={onSubmit} className="mt-6 space-y-4" aria-busy={loading} noValidate>
        <div>
          <label htmlFor={ids.project} className="block text-sm font-medium text-esm-black">Project ID</label>
          <Input
            id={ids.project}
            type="text"
            required
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            placeholder="demo-project"
            aria-describedby={error ? ids.error : undefined}
            className="mt-1"
          />
        </div>
        <div>
          <label htmlFor={ids.password} className="block text-sm font-medium text-esm-black">Password</label>
          <Input
            id={ids.password}
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            aria-describedby={error ? ids.error : undefined}
            className="mt-1"
          />
        </div>
        {error && (
          <div id={ids.error} role="alert" className="text-sm text-red-600">
            {error}
          </div>
        )}
        <Button
          type="submit"
          variant="primary"
          size="md"
          disabled={loading}
          className="w-full"
        >
          {loading ? "Signing in..." : "Sign in"}
        </Button>
        {resetSent ? (
          <p className="text-sm text-emerald-600 text-center mt-2">
            Reset request sent. Your Solutions Consultant will contact you with a new password.
          </p>
        ) : (
          <button
            type="button"
            onClick={handleForgotPassword}
            disabled={resetLoading}
            className="w-full text-sm text-esm-grey hover:text-esm-black py-1 transition-colors mt-1 disabled:opacity-50"
          >
            {resetLoading ? "Sending..." : "Forgot password?"}
          </button>
        )}
      </form>
    </Card>
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
