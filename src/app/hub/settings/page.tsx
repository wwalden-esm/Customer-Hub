import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCustomerSession } from "@/lib/magic-link";
import NotificationPrefsClient from "@/components/hub/NotificationPrefsClient";

export async function generateMetadata(): Promise<Metadata> {
  return { title: "Settings" };
}

export default async function SettingsPage() {
  const session = await getCustomerSession();
  if (!session) redirect("/hub/login");

  return (
    <div className="max-w-xl">
      <h1 className="text-2xl font-semibold text-esm-black dark:text-neutral-100 mb-6">Settings</h1>
      <NotificationPrefsClient projectId={session.projectId} />
    </div>
  );
}
