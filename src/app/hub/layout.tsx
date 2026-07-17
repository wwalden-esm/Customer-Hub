import { redirect } from "next/navigation";
import { getCustomerSession } from "@/lib/magic-link";
import { getProjectById } from "@/lib/smartsheet-data";
import { brandingCssVars } from "@/lib/branding";
import type { BrandingConfig } from "@/lib/branding";
import { isSharePointConfigured } from "@/lib/sharepoint";
import { parseLocalDate } from "@/lib/date-utils";
import LogoutButton from "@/components/hub/LogoutButton";
import SessionGuard from "@/components/hub/SessionGuard";
import NotificationBell from "@/components/hub/NotificationBell";
import GoLiveBanner from "@/components/hub/GoLiveBanner";
import HubNav from "@/components/hub/HubNav";
import Breadcrumbs from "@/components/hub/Breadcrumbs";
import PortalActivityTracker from "@/components/hub/PortalActivityTracker";
import CustomerLogo from "@/components/hub/CustomerLogo";
import HubToastProvider from "@/components/hub/HubToastProvider";
import DarkModeToggle from "@/components/hub/DarkModeToggle";
import { EsmLogo } from "@/components/ui";

const ALL_NAV_ITEMS = [
  { href: "/hub", label: "Dashboard", key: "dashboard" },
  { href: "/hub/intake", label: "Intake", key: "intake" },
  { href: "/hub/milestones", label: "Milestones", key: "milestones" },
  { href: "/hub/raid-log", label: "RAID Log", key: "raid-log" },
  { href: "/hub/meetings", label: "Meetings", key: "meetings" },
  { href: "/hub/documents", label: "Documents", key: "documents" },
  { href: "/hub/workflow-builder", label: "Workflow Builder", key: "workflow-builder" },
  { href: "/hub/recordings", label: "Recordings", key: "recordings" },
  { href: "/hub/questions", label: "Questions", key: "questions" },
  { href: "/hub/go-live", label: "Go-Live Readiness", key: "go-live" },
  { href: "/hub/status-report", label: "Status Report", key: "status-report" },
  { href: "/hub/resources", label: "Resources", key: "resources" },
  { href: "/hub/help", label: "Help", key: "help" },
];

export default async function HubLayout({ children }: { children: React.ReactNode }) {
  const session = await getCustomerSession();

  if (!session) {
    return <>{children}</>;
  }

  const project = getProjectById(session.projectId);
  if (!project) redirect("/hub/login");

  const branding = (project.branding as BrandingConfig) || {};
  const cssVars = brandingCssVars(branding);

  let daysToGoLive: number | null = null;
  if (project.goLiveDate) {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const goLive = parseLocalDate(project.goLiveDate);
    daysToGoLive = Math.ceil((goLive.getTime() - now.getTime()) / 86400000);
  }

  const visibility = project.sectionVisibility ?? {};
  const spConfigured = isSharePointConfigured();
  const navItems = ALL_NAV_ITEMS.filter((item) => {
    if (item.key === "dashboard") return true;
    if (item.key === "recordings" && !spConfigured && visibility[item.key] !== true) return false;
    if (item.key === "go-live" && (daysToGoLive === null || daysToGoLive > 60)) return false;
    return visibility[item.key] !== false;
  });

  return (
    <HubToastProvider>
    <div className="min-h-screen bg-esm-grey-light" style={cssVars}>
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>

      {daysToGoLive !== null && daysToGoLive <= 30 && daysToGoLive >= 0 && (
        <GoLiveBanner daysToGoLive={daysToGoLive} goLiveDate={project.goLiveDate!} />
      )}

      <div className="sticky top-0 z-40">
      <header className="bg-esm-black text-white" role="banner">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="flex items-center gap-3 sm:gap-4 min-w-0">
            <EsmLogo size={48} variant="white" className="shrink-0" />
            {branding.logoUrl && (
              <CustomerLogo src={branding.logoUrl} alt={`${project.customerName} logo`} />
            )}
            <span className="text-sm font-medium truncate">{project.customerName}</span>
          </div>
          <div className="flex items-center gap-3 sm:gap-4 text-sm flex-wrap">
            {project.scEmail ? (
              <a href={`mailto:${project.scEmail}`} className="text-white/80 hover:text-white transition-colors">
                SC: {project.scName}
              </a>
            ) : (
              <span className="text-white/80">SC: {project.scName}</span>
            )}
            <span className="text-white/40" aria-hidden="true">|</span>
            <a href="/hub/search" className="text-white/60 hover:text-white transition-colors" aria-label="Search">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </a>
            <NotificationBell projectId={session.projectId} />
            <DarkModeToggle />
            <a href="/hub/profile" className="text-white/80 hover:text-white truncate max-w-[150px] transition-colors" aria-label={`Profile — ${session.name || session.email}`}>
              {session.name || session.email}
            </a>
            <span className="text-white/40" aria-hidden="true">|</span>
            <LogoutButton />
          </div>
        </div>
      </header>

      <HubNav items={navItems} />
      </div>
      <Breadcrumbs items={navItems} />

      <main id="main-content" className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
        {children}
      </main>
      <SessionGuard />
      <PortalActivityTracker />
    </div>
    </HubToastProvider>
  );
}
