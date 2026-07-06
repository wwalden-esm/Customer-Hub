import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCustomerSession } from "@/lib/magic-link";
import { getProjectById } from "@/lib/smartsheet-data";
import { isSharePointConfigured, listCustomerFolderFiles } from "@/lib/sharepoint";
import RecordingsClient from "@/components/hub/RecordingsClient";

export async function generateMetadata(): Promise<Metadata> {
  return { title: "Recordings" };
}

export default async function RecordingsPage() {
  const session = await getCustomerSession();
  if (!session) redirect("/hub/login");

  const project = getProjectById(session.projectId);
  if (!project) redirect("/hub/login");

  const configured = isSharePointConfigured();
  const files = configured
    ? await listCustomerFolderFiles(project.customerName, "Meeting Notes")
    : [];

  const sharepointFolderUrl = project.sharepointFolderUrl ?? null;

  return (
    <div>
      <h1 className="text-2xl font-semibold text-esm-black mb-6">Recordings</h1>
      <RecordingsClient
        files={files}
        configured={configured}
        sharepointFolderUrl={sharepointFolderUrl}
      />
    </div>
  );
}
