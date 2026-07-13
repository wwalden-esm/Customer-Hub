"use client";

import { ToastProvider } from "@/components/ui";

export default function HubToastProvider({ children }: { children: React.ReactNode }) {
  return <ToastProvider>{children}</ToastProvider>;
}
