"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Card } from "@/components/ui";

function VerifyToken() {
  const params = useSearchParams();
  const token = params.get("token");
  const [status, setStatus] = useState<"verifying" | "success" | "error">("verifying");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setError("No login token provided. Please use the link from your invitation email.");
      return;
    }

    fetch("/api/auth/customer/magic-link", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    })
      .then(async (res) => {
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Invalid or expired link");
        }
        setStatus("success");
        setTimeout(() => {
          window.location.href = "/hub";
        }, 500);
      })
      .catch((err) => {
        setStatus("error");
        setError(err.message);
      });
  }, [token]);

  return (
    <Card padding="lg" className="!border-0 shadow w-full max-w-md !p-8 text-center">
      <div className="flex items-center justify-center gap-3 mb-4">
        <div className="w-8 h-8 bg-esm-red rounded flex items-center justify-center text-white text-xs font-bold" aria-hidden="true">
          ESM
        </div>
        <h1 className="text-2xl font-semibold text-esm-black">Implementation Customer Hub</h1>
      </div>

      {status === "verifying" && (
        <div className="py-8" role="status" aria-live="polite">
          <div className="w-8 h-8 border-2 border-esm-red border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-esm-grey">Verifying your login link...</p>
        </div>
      )}

      {status === "success" && (
        <div className="py-8" role="status" aria-live="polite">
          <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <svg className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <p className="text-sm text-emerald-700 font-medium">Signed in successfully. Redirecting...</p>
        </div>
      )}

      {status === "error" && (
        <div className="py-8" role="alert">
          <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <svg className="w-5 h-5 text-esm-red" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <p className="text-sm text-esm-red font-medium mb-2">{error}</p>
          <a
            href="/hub/login"
            className="inline-block text-sm text-esm-grey hover:text-esm-black underline"
          >
            Sign in with password instead
          </a>
        </div>
      )}
    </Card>
  );
}

export default function VerifyPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-esm-grey-light">
      <Suspense>
        <VerifyToken />
      </Suspense>
    </main>
  );
}
