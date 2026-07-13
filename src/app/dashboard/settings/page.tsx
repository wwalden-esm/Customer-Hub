import { getGlobalLinks } from "@/lib/settings";
import GlobalLinksEditor from "@/components/dashboard/GlobalLinksEditor";
import DashboardBreadcrumb from "@/components/dashboard/DashboardBreadcrumb";

export default async function SettingsPage() {
  const globalLinks = getGlobalLinks();

  return (
    <div>
      <DashboardBreadcrumb items={[{ label: "Settings" }]} />
      <div className="max-w-3xl mx-auto px-6 py-6">
        <h1 className="text-xl font-semibold text-esm-black mb-1">Global Settings</h1>
        <p className="text-sm text-esm-grey mb-6">Configuration that applies to all customer hubs</p>
        <GlobalLinksEditor initialLinks={globalLinks} />
      </div>
    </div>
  );
}
