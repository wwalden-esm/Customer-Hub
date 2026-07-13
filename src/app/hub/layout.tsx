import { redirect } from "next/navigation";
import { getCustomerSession } from "@/lib/magic-link";
import { getProjectById } from "@/lib/smartsheet-data";
import { brandingCssVars } from "@/lib/branding";
import type { BrandingConfig } from "@/lib/branding";
import LogoutButton from "@/components/hub/LogoutButton";
import SessionGuard from "@/components/hub/SessionGuard";
import NotificationBell from "@/components/hub/NotificationBell";
import HubNav from "@/components/hub/HubNav";
import Breadcrumbs from "@/components/hub/Breadcrumbs";
import PortalActivityTracker from "@/components/hub/PortalActivityTracker";
import CustomerLogo from "@/components/hub/CustomerLogo";
import { EsmLogo } from "@/components/ui";

const ALL_NAV_ITEMS = [
  { href: "/hub", label: "Dashboard", key: "dashboard" },
  { href: "/hub/intake", label: "Intake", key: "intake" },
  { href: "/hub/action-items", label: "Action Items", key: "action-items" },
  { href: "/hub/raid-log", label: "RAID Log", key: "raid-log" },
  { href: "/hub/meetings", label: "Meetings", key: "meetings" },
  { href: "/hub/documents", label: "Documents", key: "documents" },
  { href: "/hub/recordings", label: "Recordings", key: "recordings" },
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

  const visibility = project.sectionVisibility ?? {};
  const navItems = ALL_NAV_ITEMS.filter(
    (item) => item.key === "dashboard" || visibility[item.key] !== false,
  );

  return (
    <div className="min-h-screen bg-esm-grey-light" style={cssVars}>
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>

      <header className="bg-[#3D3A3C] text-white" role="banner">
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
            <NotificationBell projectId={session.projectId} />
            <span className="text-white/80 truncate max-w-[150px]" aria-label={`Logged in as ${session.name || session.email}`}>
              {session.name || session.email}
            </span>
            <span className="text-white/40" aria-hidden="true">|</span>
            <LogoutButton />
          </div>
        </div>
      </header>

      <HubNav items={navItems} />
      <Breadcrumbs items={navItems} />

      <main id="main-content" className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
        {children}
      </main>
      <SessionGuard />
      <PortalActivityTracker />
    </div>
  );
}
