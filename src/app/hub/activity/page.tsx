import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCustomerSession } from "@/lib/magic-link";
import { getSmartsheetConfig, getProjectActivity } from "@/lib/smartsheet-data";
import ActivityFeed from "@/components/dashboard/ActivityFeed";

export async function generateMetadata(): Promise<Metadata> {
  return { title: "Activity History" };
}

export default async function ActivityHistoryPage() {
  const session = await getCustomerSession();
  if (!session) redirect("/hub/login");

  const config = getSmartsheetConfig(session.projectId);
  let activity: Awaited<ReturnType<typeof getProjectActivity>> = [];

  try {
    activity = await getProjectActivity(config);
  } catch {
    // fall through
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold text-esm-black mb-6">Activity History</h1>
      <ActivityFeed events={activity} />
    </div>
  );
}
