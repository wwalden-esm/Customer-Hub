import Link from "next/link";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getGlobalLinks } from "@/lib/settings";
import GlobalLinksEditor from "@/components/dashboard/GlobalLinksEditor";

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const globalLinks = getGlobalLinks();

  return (
    <main className="min-h-screen bg-esm-grey-light">
      <div className="bg-white border-b border-esm-border">
        <div className="max-w-3xl mx-auto px-6 py-4">
          <div className="flex items-center gap-2 text-sm text-esm-grey mb-2">
            <Link href="/dashboard" className="hover:text-esm-black">Dashboard</Link>
            <span>/</span>
            <span className="text-esm-black">Settings</span>
          </div>
          <h1 className="text-xl font-semibold text-esm-black">Global Settings</h1>
          <p className="text-sm text-esm-grey">Configuration that applies to all customer hubs</p>
        </div>
      </div>
      <div className="max-w-3xl mx-auto px-6 py-6 space-y-6">
        <GlobalLinksEditor initialLinks={globalLinks} />
      </div>
    </main>
  );
}
