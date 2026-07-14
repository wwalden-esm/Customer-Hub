import { redirect } from "next/navigation";
import { getCustomerSession } from "@/lib/magic-link";
import { getProjectById } from "@/lib/smartsheet-data";
import { getGlobalLinks } from "@/lib/settings";
import type { HubLink } from "@/types/hub";
import QuickLinks from "@/components/hub/QuickLinks";

export default async function ResourcesPage() {
  const session = await getCustomerSession();
  if (!session) redirect("/hub/login");

  const project = getProjectById(session.projectId);
  if (!project) redirect("/hub/login");

  const globalLinks = getGlobalLinks();
  const projectLinks = (project.links ?? []) as HubLink[];
  const links: HubLink[] = [
    ...globalLinks.map((l) => ({ label: l.label, url: l.url, icon: l.icon })),
    ...projectLinks.map((l) => ({ label: l.label, url: l.url, icon: l.icon })),
  ];

  return (
    <div>
      <h1 className="text-lg font-bold text-esm-black mb-4">Resources</h1>
      {links.length > 0 ? (
        <QuickLinks links={links} />
      ) : (
        <div className="text-center py-12 text-sm text-esm-grey">
          No resources have been configured for this project yet.
        </div>
      )}
    </div>
  );
}
