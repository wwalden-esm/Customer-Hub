import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCustomerSession } from "@/lib/magic-link";
import { getSmartsheetConfig, getProjectMilestones, getProjectActionItems, getProjectMeetings, getProjectActivity, getRaidLogItems, getProjectDocuments } from "@/lib/smartsheet-data";
import { getProjectQuestions } from "@/lib/question-store";
import SearchClient from "@/components/hub/SearchClient";

export async function generateMetadata(): Promise<Metadata> {
  return { title: "Search" };
}

export default async function SearchPage() {
  const session = await getCustomerSession();
  if (!session) redirect("/hub/login");

  const config = getSmartsheetConfig(session.projectId);

  const [milestones, actionItems, meetings, , raidItems] = await Promise.all([
    config.projectPlanSheetId ? getProjectMilestones(config.projectPlanSheetId) : Promise.resolve([]),
    (config.actionItemSheetId || config.raidLogSheetId) ? getProjectActionItems(config.actionItemSheetId || config.raidLogSheetId!) : Promise.resolve([]),
    config.meetingTrackerSheetId ? getProjectMeetings(config.meetingTrackerSheetId) : Promise.resolve([]),
    getProjectActivity(config).catch(() => []),
    config.raidLogSheetId ? getRaidLogItems(config.raidLogSheetId) : Promise.resolve([]),
  ]);

  const questions = getProjectQuestions(session.projectId);
  const documents = config.documentSheetId
    ? await getProjectDocuments(config.documentSheetId)
    : [];

  const searchItems = [
    ...milestones.map((m) => ({
      id: `milestone-${m.id}`,
      type: "milestone" as const,
      title: m.name,
      detail: `Status: ${m.status}${m.endDate ? ` · Due: ${m.endDate}` : ""}`,
      href: "/hub/raid-log",
    })),
    ...actionItems.map((a) => ({
      id: `action-${a.id}`,
      type: "action" as const,
      title: a.description,
      detail: `${a.owner || "Unassigned"} · ${a.status}${a.dueDate ? ` · Due: ${a.dueDate}` : ""}`,
      href: "/hub/raid-log",
    })),
    ...meetings.map((m) => ({
      id: `meeting-${m.id}`,
      type: "meeting" as const,
      title: m.week,
      detail: [m.milestone, m.meetingDate].filter(Boolean).join(" · "),
      href: "/hub/meetings",
    })),
    ...raidItems.map((r) => ({
      id: `raid-${r.id}`,
      type: "raid" as const,
      title: r.item,
      detail: `${r.type} · ${r.status} · ${r.priority}`,
      href: "/hub/raid-log",
    })),
    ...questions.map((q) => ({
      id: `question-${q.id}`,
      type: "question" as const,
      title: q.subject || "Question",
      detail: [q.message, ...(q.messages || []).map((m: { text: string }) => m.text)].filter(Boolean).join(" ").slice(0, 200),
      href: "/hub/ask",
    })),
    ...documents.map((d) => ({
      id: `document-${d.id}`,
      type: "document" as const,
      title: d.name,
      detail: `Type: ${d.type}${d.status ? ` · ${d.status}` : ""}`,
      href: "/hub/documents",
    })),
  ];

  return (
    <div>
      <h1 className="text-2xl font-semibold text-esm-black mb-6">Search</h1>
      <SearchClient items={searchItems} />
    </div>
  );
}
