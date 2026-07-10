import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import MeetingStructure from "@/components/hub/MeetingStructure";

export const metadata: Metadata = { title: "Meeting Guide" };

export default async function MeetingGuidePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <main className="min-h-screen bg-esm-grey-light">
      <div className="bg-white border-b border-[#E2E0E1]">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center gap-2 text-sm text-esm-grey mb-2">
            <Link href="/dashboard" className="hover:text-esm-black">Dashboard</Link>
            <span>/</span>
            <span className="text-esm-black">Meeting Guide</span>
          </div>
          <h1 className="text-xl font-semibold text-esm-black">Weekly Meeting Guide</h1>
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-6 py-6">
        <MeetingStructure />
      </div>
    </main>
  );
}
