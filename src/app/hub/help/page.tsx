import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createJsonStore } from "@/lib/data-store";
import { getCustomerSession } from "@/lib/magic-link";
import { getProjectById } from "@/lib/smartsheet-data";
import { Card, SectionLabel } from "@/components/ui";

export async function generateMetadata(): Promise<Metadata> {
  return { title: "Help & FAQ" };
}

const faqsStore = createJsonStore<Record<string, Array<{ q: string; a: string }>>>("faqs", {});

function loadFaqs(projectId: string): Array<{ q: string; a: string }> {
  try {
    const all = faqsStore.load();
    return all[projectId] || all.default || [];
  } catch {
    return [];
  }
}

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
        {loadFaqs(project.id).map((faq, i) => (
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
