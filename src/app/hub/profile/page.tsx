import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCustomerSession } from "@/lib/magic-link";
import { getProjectById } from "@/lib/smartsheet-data";
import { Card, SectionLabel, Badge } from "@/components/ui";
import { parseLocalDate } from "@/lib/date-utils";

export async function generateMetadata(): Promise<Metadata> {
  return { title: "My Profile" };
}

export default async function ProfilePage() {
  const session = await getCustomerSession();
  if (!session) redirect("/hub/login");

  const project = getProjectById(session.projectId);
  if (!project) redirect("/hub/login");

  const contacts = project.contacts ?? [];
  const currentContact = contacts.find(
    (c) => c.email === session.email || c.name === session.name
  );

  return (
    <div>
      <h1 className="text-2xl font-semibold text-esm-black mb-6">My Profile</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Contact Info */}
        <Card padding="md">
          <SectionLabel className="mb-4">Contact Information</SectionLabel>
          <div className="space-y-3">
            <div>
              <label className="text-[10px] font-bold text-esm-grey uppercase tracking-wider">Name</label>
              <p className="text-sm text-esm-black mt-0.5">{session.name || "—"}</p>
            </div>
            <div>
              <label className="text-[10px] font-bold text-esm-grey uppercase tracking-wider">Email</label>
              <p className="text-sm text-esm-black mt-0.5">{session.email || "—"}</p>
            </div>
            {currentContact?.role && (
              <div>
                <label className="text-[10px] font-bold text-esm-grey uppercase tracking-wider">Role</label>
                <p className="text-sm text-esm-black mt-0.5">{currentContact.role}</p>
              </div>
            )}
            <div>
              <label className="text-[10px] font-bold text-esm-grey uppercase tracking-wider">Organization</label>
              <p className="text-sm text-esm-black mt-0.5">{project.customerName}</p>
            </div>
          </div>
        </Card>

        {/* Project Info */}
        <Card padding="md">
          <SectionLabel className="mb-4">Project Details</SectionLabel>
          <div className="space-y-3">
            <div>
              <label className="text-[10px] font-bold text-esm-grey uppercase tracking-wider">Project</label>
              <p className="text-sm text-esm-black mt-0.5">{project.projectName}</p>
            </div>
            <div>
              <label className="text-[10px] font-bold text-esm-grey uppercase tracking-wider">Products</label>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {project.products.map((p) => (
                  <Badge key={p} variant="neutral">{p}</Badge>
                ))}
              </div>
            </div>
            <div>
              <label className="text-[10px] font-bold text-esm-grey uppercase tracking-wider">Current Phase</label>
              <p className="text-sm text-esm-black mt-0.5">{project.currentPhase}</p>
            </div>
            <div>
              <label className="text-[10px] font-bold text-esm-grey uppercase tracking-wider">Status</label>
              <div className="mt-1">
                <Badge variant={project.status === "ON_TRACK" ? "success" : project.status === "AT_RISK" ? "warning" : "danger"}>
                  {project.status.replace(/_/g, " ")}
                </Badge>
              </div>
            </div>
            {project.goLiveDate && (
              <div>
                <label className="text-[10px] font-bold text-esm-grey uppercase tracking-wider">Go-Live Date</label>
                <p className="text-sm text-esm-black mt-0.5">
                  {parseLocalDate(project.goLiveDate).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                </p>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Team Contacts */}
      <Card padding="md" className="mt-5">
        <SectionLabel className="mb-4">Project Team</SectionLabel>
        <div className="divide-y divide-gray-100">
          {/* ESM Team */}
          {[
            { name: project.scName, email: project.scEmail, role: "Solutions Consultant" },
            ...(project.saName ? [{ name: project.saName, email: project.saEmail, role: "Solutions Architect" }] : []),
          ].map((member) => (
            <div key={member.email || member.name} className="flex items-center justify-between py-3">
              <div className="flex items-center gap-3">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                  style={{ backgroundColor: "var(--hub-accent, #F4333F)" }}
                >
                  {member.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                </div>
                <div>
                  <p className="text-sm font-medium text-esm-black">{member.name}</p>
                  <p className="text-xs text-esm-grey">{member.role} · ESM Solutions</p>
                </div>
              </div>
              {member.email && (
                <a
                  href={`mailto:${member.email}`}
                  className="text-xs font-medium hover:underline"
                  style={{ color: "var(--hub-accent, #F4333F)" }}
                >
                  Email
                </a>
              )}
            </div>
          ))}

          {/* Customer Contacts */}
          {contacts.map((contact) => (
            <div key={contact.email} className="flex items-center justify-between py-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full flex items-center justify-center bg-slate-200 text-esm-grey text-xs font-bold shrink-0">
                  {contact.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2)}
                </div>
                <div>
                  <p className="text-sm font-medium text-esm-black">
                    {contact.name}
                    {contact.email === session.email && (
                      <span className="text-xs text-esm-muted ml-1.5">(you)</span>
                    )}
                  </p>
                  <p className="text-xs text-esm-grey">{contact.role} · {project.customerName}</p>
                </div>
              </div>
              <a
                href={`mailto:${contact.email}`}
                className="text-xs font-medium hover:underline"
                style={{ color: "var(--hub-accent, #F4333F)" }}
              >
                Email
              </a>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
