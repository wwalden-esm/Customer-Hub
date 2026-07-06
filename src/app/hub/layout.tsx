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

const ALL_NAV_ITEMS = [
  { href: "/hub", label: "Dashboard", key: "dashboard" },
  { href: "/hub/intake", label: "Intake", key: "intake" },
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
      {/* Header */}
      <header className="bg-esm-black text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="flex items-center gap-3 sm:gap-4 min-w-0">
            <div className="w-8 h-8 bg-esm-red rounded flex items-center justify-center text-white text-xs font-bold shrink-0">
              ESM
            </div>
            {branding.logoUrl && (
              <>
                <div className="w-px h-6 bg-white/20 hidden sm:block" />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={branding.logoUrl} alt="" className="h-8 max-w-[120px] object-contain hidden sm:block" />
              </>
            )}
            <span className="text-sm font-medium truncate">{project.customerName}</span>
          </div>
          <div className="flex items-center gap-3 sm:gap-4 text-sm flex-wrap">
            {project.scEmail ? (
              <a href={`mailto:${project.scEmail}`} className="text-white/60 hover:text-white transition-colors" title="Email your Solutions Consultant">
                SC: {project.scName}
              </a>
            ) : (
              <span className="text-white/60">SC: {project.scName}</span>
            )}
            <span className="text-white/40">|</span>
            <NotificationBell projectId={session.projectId} />
            <span className="text-white/80 truncate max-w-[150px]">{session.name || session.email}</span>
            <span className="text-white/40">|</span>
            <LogoutButton />
          </div>
        </div>
      </header>

      <HubNav items={navItems} />
      <Breadcrumbs items={navItems} />

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6">{children}</main>
      <SessionGuard />
    </div>
  );
}
