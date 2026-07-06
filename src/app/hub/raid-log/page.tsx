import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCustomerSession } from "@/lib/magic-link";
import { getSmartsheetConfig, getRaidLogItems } from "@/lib/smartsheet-data";
import RaidLogClient from "@/components/hub/RaidLogClient";

export async function generateMetadata(): Promise<Metadata> {
  return { title: "RAID Log" };
}

export default async function RaidLogPage() {
  const session = await getCustomerSession();
  if (!session) redirect("/hub/login");

  const config = getSmartsheetConfig(session.projectId);
  const items = config.raidLogSheetId
    ? await getRaidLogItems(config.raidLogSheetId)
    : [];

  return (
    <div>
      <h1 className="text-2xl font-semibold text-esm-black mb-6">RAID Log</h1>
      <RaidLogClient items={items} />
    </div>
  );
}
