import { auth, signOut } from "@/lib/auth";
import { redirect } from "next/navigation";
import DarkModeToggle from "@/components/hub/DarkModeToggle";
import HubToastProvider from "@/components/hub/HubToastProvider";
import ActiveNavLink from "@/components/dashboard/ActiveNavLink";

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
      <div className="min-h-screen bg-esm-grey-light">
        <header className="bg-white border-b border-esm-border sticky top-0 z-30">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-2">
            <a href="/dashboard" className="flex items-center gap-2 no-underline shrink-0">
              <div className="w-8 h-8 bg-esm-red rounded flex items-center justify-center text-white text-xs font-bold">
                ESM
              </div>
              <span className="text-lg font-semibold text-esm-black hidden sm:inline">
                Implementation Hub
              </span>
            </a>

            <nav className="flex items-center gap-1 overflow-x-auto min-w-0 flex-1 mx-2">
              {navLinks.map((link) => (
                <ActiveNavLink key={link.href} href={link.href} exact={link.exact}>
                  {link.label}
                </ActiveNavLink>
              ))}
            </nav>

            <div className="flex items-center gap-2 shrink-0">
              <DarkModeToggle />
              <div className="text-right hidden sm:block">
                <p className="text-sm font-medium text-esm-black leading-tight">{userName}</p>
                <p className="text-[10px] text-esm-muted uppercase tracking-wider">{userRole}</p>
              </div>
              <form
                action={async () => {
                  "use server";
                  await signOut({ redirectTo: "/login" });
                }}
              >
                <button
                  type="submit"
                  className="text-xs text-esm-grey hover:text-esm-black px-2 py-1 rounded border border-esm-border hover:bg-slate-50 transition-colors"
                >
                  Sign out
                </button>
              </form>
            </div>
          </div>
        </header>

        <main>{children}</main>
      </div>
    </HubToastProvider>
  );
}
