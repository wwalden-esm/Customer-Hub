import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCustomerSession } from "@/lib/magic-link";
import { getProjectById } from "@/lib/smartsheet-data";
import { Card, SectionLabel } from "@/components/ui";

export async function generateMetadata(): Promise<Metadata> {
  return { title: "Help & FAQ" };
}

const FAQS = [
  {
    q: "How do I track my project progress?",
    a: "Your Dashboard shows real-time project health, milestones, and metrics. The Project Timeline section gives a visual overview of where things stand. Key metrics like milestone completion, integration status, and days to go-live are updated automatically from your project data.",
  },
  {
    q: "How do I update the status of my action items?",
    a: "Navigate to the Action Items page from the RAID Log. You can change the status of any open action item using the dropdown in the Status column. Changes are saved automatically to your project tracker.",
  },
  {
    q: "Where can I find meeting recordings?",
    a: "If your project has SharePoint configured, meeting recordings are available under the Recordings section in the navigation. Your Solutions Consultant will upload recordings after each session.",
  },
  {
    q: "How do I access project documents?",
    a: "Visit the Documents page to see all project documents. You can download any document by clicking the download button. Documents include workflow templates, UAT trackers, project charters, and more.",
  },
  {
    q: "What is the RAID Log?",
    a: "RAID stands for Risks, Actions, Issues, and Decisions. The RAID Log tracks all of these items for your project. You can view and filter items by type, status, and priority.",
  },
  {
    q: "How do I prepare for upcoming meetings?",
    a: "Check the Upcoming Meetings section on your Dashboard for meeting dates, agendas, and any deliverables due from your team. Items marked 'Due from you' highlight what your team needs to prepare before the next meeting.",
  },
  {
    q: "What does the project health status mean?",
    a: "Project health reflects the overall state of your implementation: On Track (green) means everything is progressing as planned, At Risk (amber) means there are items that need attention, and Off Track (red) means there are blockers that need immediate resolution.",
  },
  {
    q: "How do I contact my ESM implementation team?",
    a: "Use the 'Email Team' or 'Request a Meeting' buttons on the Dashboard, or use the Ask a Question form to send a message directly to your Solutions Consultant.",
  },
  {
    q: "What is the intake process?",
    a: "Intake is the initial data-gathering phase where we collect information about your institution, systems, and requirements. Your intake form may be pre-populated from HubSpot. Review the Intake section to see what information has been gathered.",
  },
  {
    q: "How often is the portal data updated?",
    a: "Project data is synced from Smartsheet in real-time when you load the page. You can click the Refresh button on the Dashboard to pull the latest data.",
  },
];

export default async function HelpPage() {
  const session = await getCustomerSession();
  if (!session) redirect("/hub/login");

  const project = getProjectById(session.projectId);
  if (!project) redirect("/hub/login");

  return (
    <div>
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-esm-black">Help & FAQ</h1>
          <p className="text-sm text-esm-grey mt-1">Common questions about your implementation portal</p>
        </div>
        <a
          href="/hub/ask"
          className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white rounded-card transition-colors hover:opacity-90"
          style={{ backgroundColor: "var(--hub-accent, #F4333F)" }}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          </svg>
          Ask a Question
        </a>
      </div>

      {/* Portal Guide */}
      <Card padding="md" className="mb-6">
        <SectionLabel className="mb-4">Portal Guide</SectionLabel>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {[
            { label: "Dashboard", desc: "Project overview, health, and metrics", href: "/hub" },
            { label: "Intake", desc: "Initial data gathering and requirements", href: "/hub/intake" },
            { label: "RAID Log", desc: "Risks, Actions, Issues, and Decisions", href: "/hub/raid-log" },
            { label: "Meetings", desc: "Meeting history, agendas, and notes", href: "/hub/meetings" },
            { label: "Documents", desc: "Project documents and templates", href: "/hub/documents" },
            { label: "Notifications", desc: "Recent activity and updates", href: "/hub/notifications" },
          ].map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="flex items-start gap-3 p-3 rounded-card border border-esm-border hover:border-gray-300 hover:bg-gray-50 transition-colors"
            >
              <div className="flex-1">
                <p className="text-sm font-medium text-esm-black">{item.label}</p>
                <p className="text-xs text-esm-grey mt-0.5">{item.desc}</p>
              </div>
              <svg className="w-4 h-4 text-esm-muted shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </a>
          ))}
        </div>
      </Card>

      {/* FAQ */}
      <SectionLabel className="mb-3">Frequently Asked Questions</SectionLabel>
      <div className="space-y-3">
        {FAQS.map((faq, i) => (
          <Card key={i} padding="md">
            <p className="text-sm font-medium text-esm-black mb-2">{faq.q}</p>
            <p className="text-sm text-esm-grey leading-relaxed">{faq.a}</p>
          </Card>
        ))}
      </div>

      {/* Contact */}
      <Card padding="md" className="mt-6">
        <SectionLabel className="mb-2">Still need help?</SectionLabel>
        <p className="text-sm text-esm-grey mb-3">
          Your implementation team is here to help. Reach out to your Solutions Consultant directly.
        </p>
        <div className="flex gap-3">
          {project.scEmail && (
            <a
              href={`mailto:${project.scEmail}?subject=${encodeURIComponent(`${project.projectName} — Help Request`)}`}
              className="inline-flex items-center gap-1.5 text-sm font-medium px-4 py-2 rounded-card border transition-colors hover:bg-slate-50"
              style={{ color: "var(--hub-accent, #F4333F)", borderColor: "var(--hub-accent, #F4333F)" }}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              Email {project.scName}
            </a>
          )}
          <a
            href="/hub/ask"
            className="inline-flex items-center gap-1.5 text-sm font-medium px-4 py-2 rounded-card border border-esm-border transition-colors hover:bg-slate-50 text-esm-black"
          >
            Ask a Question
          </a>
        </div>
      </Card>
    </div>
  );
}
