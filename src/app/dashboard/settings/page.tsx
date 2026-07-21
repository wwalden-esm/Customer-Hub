import { getGlobalLinks, getSettings } from "@/lib/settings";
import GlobalLinksEditor from "@/components/dashboard/GlobalLinksEditor";
import SettingsPanel from "@/components/dashboard/SettingsPanel";
import WeeklyDigestPanel from "@/components/dashboard/WeeklyDigestPanel";
import DashboardBreadcrumb from "@/components/dashboard/DashboardBreadcrumb";

export default async function SettingsPage() {
  const globalLinks = getGlobalLinks();
  const settings = getSettings();
  const envInfo = {
    emailFrom: process.env.EMAIL_FROM || "",
    hasResendKey: !!process.env.RESEND_API_KEY,
    hasSmartsheetToken: !!process.env.SMARTSHEET_API_TOKEN,
    portfolioSheetId: process.env.SMARTSHEET_PORTFOLIO_SHEET_ID || "",
    workspaceId: process.env.SMARTSHEET_WORKSPACE_ID || "",
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const defaultAccentColor = (settings as any).defaultAccentColor || "#1E3A5F";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const allowRaid = (settings as any).allowCustomerRaidSubmissions !== false;

  return (
    <div>
      <DashboardBreadcrumb items={[{ label: "Settings" }]} />
      <div className="max-w-3xl mx-auto px-6 py-6">
        <h1 className="text-xl font-semibold text-esm-black mb-1">Global Settings</h1>
        <p className="text-sm text-esm-grey mb-6">Configuration that applies to all customer hubs</p>
        <GlobalLinksEditor initialLinks={globalLinks} />
        <SettingsPanel envInfo={envInfo} initialAccentColor={defaultAccentColor} initialAllowRaidSubmissions={allowRaid} />
        <WeeklyDigestPanel />
      </div>
    </div>
  );
}
