import { auth, signOut } from "@/lib/auth";
import { redirect } from "next/navigation";
import DarkModeToggle from "@/components/hub/DarkModeToggle";
import HubToastProvider from "@/components/hub/HubToastProvider";

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

  return (
    <HubToastProvider>
      <div className="min-h-screen bg-esm-grey-light">
        <header className="bg-white border-b border-esm-border sticky top-0 z-30">
          <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <a href="/dashboard" className="flex items-center gap-3 no-underline">
                <div className="w-8 h-8 bg-esm-red rounded flex items-center justify-center text-white text-xs font-bold">
                  ESM
                </div>
                <span className="text-lg font-semibold text-esm-black hidden sm:inline">
                  Implementation Hub
                </span>
              </a>
            </div>

            <nav className="flex items-center gap-1">
              <a
                href="/dashboard"
                className="text-sm text-esm-grey hover:text-esm-black px-2.5 py-1.5 rounded-card hover:bg-slate-50 transition-colors"
              >
                Projects
              </a>
              <a
                href="/dashboard/meeting-guide"
                className="text-sm text-esm-grey hover:text-esm-black px-2.5 py-1.5 rounded-card hover:bg-slate-50 transition-colors"
              >
                Meeting Guide
              </a>
              <a
                href="/dashboard/settings"
                className="text-sm text-esm-grey hover:text-esm-black px-2.5 py-1.5 rounded-card hover:bg-slate-50 transition-colors"
              >
                Settings
              </a>
              <a
                href="/dashboard/users"
                className="text-sm text-esm-grey hover:text-esm-black px-2.5 py-1.5 rounded-card hover:bg-slate-50 transition-colors"
              >
                Users
              </a>
            </nav>

            <div className="flex items-center gap-3">
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
