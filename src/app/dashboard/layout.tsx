import { auth, signOut } from "@/lib/auth";
import { redirect } from "next/navigation";
import DarkModeToggle from "@/components/hub/DarkModeToggle";
import HubToastProvider from "@/components/hub/HubToastProvider";
import DashboardNav from "@/components/dashboard/DashboardNav";
import KeyboardShortcuts from "@/components/dashboard/KeyboardShortcuts";
import { EsmLogo, EsmFooter } from "@/components/ui";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const userEmail = session.user.email || "";
  const userRole = session.user.role || "SC";
  const userName = session.user.name || userEmail;

  const navLinks = [
    { href: "/dashboard", label: "Projects", exact: true },
    { href: "/dashboard/analytics", label: "Analytics" },
    { href: "/dashboard/questions", label: "Questions" },
    { href: "/dashboard/meeting-guide", label: "Meeting Guide" },
    { href: "/dashboard/settings", label: "Settings" },
    { href: "/dashboard/users", label: "Users" },
    ...(userRole === "ADMIN" ? [{ href: "/dashboard/audit", label: "Audit" }] : []),
  ];

  return (
    <HubToastProvider>
      <div className="min-h-screen bg-esm-grey-light dark:bg-neutral-900 flex flex-col">
        <a href="#main-content" className="skip-link">
          Skip to main content
        </a>
        <header className="bg-esm-red sticky top-0 z-30" role="banner">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-2">
            <a href="/dashboard" className="flex items-center gap-3 no-underline shrink-0">
              <EsmLogo size={72} variant="white" />
              <span className="text-lg font-semibold text-white hidden sm:inline">
                Implementation Hub
              </span>
            </a>

            <DashboardNav links={navLinks} />

            <div className="flex items-center gap-2 shrink-0">
              <DarkModeToggle />
              <div className="text-right hidden sm:block">
                <p className="text-sm font-medium text-white leading-tight">{userName}</p>
                <p className="text-[10px] text-white/70 uppercase tracking-wider">{userRole}</p>
              </div>
              <form
                action={async () => {
                  "use server";
                  await signOut({ redirectTo: "/login" });
                }}
              >
                <button
                  type="submit"
                  className="text-xs text-white/80 hover:text-white px-2 py-1 rounded border border-white/30 hover:bg-white/10 transition-colors"
                >
                  Sign out
                </button>
              </form>
            </div>
          </div>
        </header>

        <main id="main-content" className="flex-1">{children}</main>
        <EsmFooter variant="staff" />
        <KeyboardShortcuts />
      </div>
    </HubToastProvider>
  );
}
