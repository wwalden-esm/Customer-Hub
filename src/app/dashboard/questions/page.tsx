import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getAllQuestions, getAllQuestionsAsync } from "@/lib/question-store";
import { getProjectById } from "@/lib/smartsheet-data";
import DashboardBreadcrumb from "@/components/dashboard/DashboardBreadcrumb";
import QuestionsManager from "@/components/dashboard/QuestionsManager";

export const dynamic = "force-dynamic";

export default async function QuestionsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  let rawQuestions;
  try {
    rawQuestions = await getAllQuestionsAsync();
  } catch {
    rawQuestions = getAllQuestions();
  }
  const questions = rawQuestions.map((q) => {
    const project = getProjectById(q.projectId);
    return {
      ...q,
      customerName: project?.customerName || q.projectId,
    };
  });

  return (
    <div>
      <DashboardBreadcrumb items={[{ label: "Customer Questions" }]} />
      <div className="max-w-4xl mx-auto px-6 py-6">
        <div className="mb-6">
          <h1 className="text-xl font-semibold text-esm-black">Customer Questions</h1>
          <p className="text-sm text-esm-grey mt-1">
            {questions.filter((q) => q.status === "open").length} open question{questions.filter((q) => q.status === "open").length !== 1 ? "s" : ""} across all projects
          </p>
        </div>
        <QuestionsManager questions={questions} />
      </div>
    </div>
  );
}
