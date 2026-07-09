import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCustomerSession } from "@/lib/magic-link";
import { getSmartsheetConfig, getProjectActionItems } from "@/lib/smartsheet-data";
import ActionItemsClient from "@/components/hub/ActionItemsClient";

export async function generateMetadata(): Promise<Metadata> {
  return { title: "Action Items" };
}

export default async function ActionItemsPage() {
  const session = await getCustomerSession();
  if (!session) redirect("/hub/login");

  const config = getSmartsheetConfig(session.projectId);
  const items = config.actionItemSheetId
    ? await getProjectActionItems(config.actionItemSheetId)
    : [];

  return (
    <div>
      <h1 className="text-2xl font-semibold text-esm-black mb-6">Action Items</h1>
      <ActionItemsClient items={items} projectId={session.projectId} />
    </div>
  );
}
