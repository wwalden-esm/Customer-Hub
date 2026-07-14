import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCustomerSession } from "@/lib/magic-link";
import { getProjectQuestions, getProjectQuestionsAsync } from "@/lib/question-store";
import QuestionThread from "@/components/hub/QuestionThread";

export const metadata: Metadata = { title: "My Questions" };
export const dynamic = "force-dynamic";

export default async function QuestionsPage() {
  const session = await getCustomerSession();
  if (!session) redirect("/hub/login");

  let questions;
  try {
    questions = await getProjectQuestionsAsync(session.projectId);
  } catch {
    questions = getProjectQuestions(session.projectId);
  }

  return (
    <div>
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-esm-black">My Questions</h1>
          <p className="text-sm text-esm-grey mt-1">
            Track your questions and responses from the implementation team
          </p>
        </div>
        <a
          href="/hub/ask"
          className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white rounded-card transition-colors hover:opacity-90"
          style={{ backgroundColor: "var(--hub-accent, #F4333F)" }}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          New Question
        </a>
      </div>

      <QuestionThread questions={questions} projectId={session.projectId} />
    </div>
  );
}
