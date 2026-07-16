import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCustomerSession } from "@/lib/magic-link";
import { getHubDashboardData } from "@/lib/hub-data";
import {
  getProjectMilestoneComments,
  getProjectMilestoneCommentsAsync,
} from "@/lib/milestone-comments";
import { getFeedbackForProject } from "@/lib/milestone-feedback";
import MilestonesClient from "@/components/hub/MilestonesClient";

export async function generateMetadata(): Promise<Metadata> {
  return { title: "Milestones" };
}

export default async function MilestonesPage() {
  const session = await getCustomerSession();
  if (!session) redirect("/hub/login");

  const data = await getHubDashboardData(
    session.projectId,
    session.name ?? undefined
  );
  if (!data) redirect("/hub/login");

  const { project } = data;

  /* Milestone comments — async with sync fallback */
  let milestoneComments;
  try {
    milestoneComments = await getProjectMilestoneCommentsAsync(
      session.projectId
    );
  } catch {
    milestoneComments = getProjectMilestoneComments(session.projectId);
  }

  /* Comment authors — deduped from project contacts + team */
  const commentAuthors = [
    ...(project.contacts || []).map((c) => ({ name: c.name, email: c.email })),
    ...(project.executiveSponsorName
      ? [
          {
            name: project.executiveSponsorName,
            email: project.executiveSponsorEmail || "",
          },
        ]
      : []),
    ...(project.projectChampionName
      ? [
          {
            name: project.projectChampionName,
            email: project.projectChampionEmail || "",
          },
        ]
      : []),
    ...(project.scName
      ? [{ name: project.scName, email: project.scEmail || "" }]
      : []),
    ...(project.pmName
      ? [{ name: project.pmName, email: project.pmEmail || "" }]
      : []),
    ...(project.saName
      ? [{ name: project.saName, email: project.saEmail || "" }]
      : []),
  ].filter(
    (a, i, arr) => a.name && arr.findIndex((b) => b.name === a.name) === i
  );

  /* Feedback */
  const milestoneFeedback = getFeedbackForProject(session.projectId);

  return (
    <>
      {/* ── Page Header ── */}
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-esm-black">Milestones</h1>
          <p className="text-sm text-esm-grey mt-1">
            {project.projectName}
          </p>
        </div>
        <a
          href="/hub"
          className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-card border border-esm-border text-esm-grey hover:bg-slate-50 transition-colors"
        >
          <svg
            className="w-3.5 h-3.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M10 19l-7-7m0 0l7-7m-7 7h18"
            />
          </svg>
          Back to Dashboard
        </a>
      </div>

      {/* ── Client-side interactive content ── */}
      <MilestonesClient
        milestones={data.milestones}
        projectId={session.projectId}
        initialComments={milestoneComments}
        commentAuthors={commentAuthors}
        initialFeedback={milestoneFeedback}
      />
    </>
  );
}
