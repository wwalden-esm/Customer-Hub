import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCustomerSession } from "@/lib/magic-link";
import { getSmartsheetConfig, getProjectActivity } from "@/lib/smartsheet-data";
import NotificationsClient from "@/components/hub/NotificationsClient";

export async function generateMetadata(): Promise<Metadata> {
  return { title: "Notifications" };
}

export default async function NotificationsPage() {
  const session = await getCustomerSession();
  if (!session) redirect("/hub/login");

  const config = getSmartsheetConfig(session.projectId);
  let activity: Awaited<ReturnType<typeof getProjectActivity>> = [];

  try {
    activity = await getProjectActivity(config);
  } catch {
    // fall through with empty
  }

  const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const notifications = activity
    .filter((e) => new Date(e.timestamp).getTime() > thirtyDaysAgo)
    .map((e) => ({
      id: e.id,
      title: e.title,
      detail: e.detail || "",
      timestamp: e.timestamp,
      type: e.type,
    }));

  return (
    <div>
      <h1 className="text-2xl font-semibold text-esm-black mb-6">Notifications</h1>
      <NotificationsClient notifications={notifications} />
    </div>
  );
}
