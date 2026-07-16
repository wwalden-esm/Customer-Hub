import { getAllQuestions } from "@/lib/question-store";
import { getProjectList } from "@/lib/smartsheet-data";
import QuestionsManager from "@/components/dashboard/QuestionsManager";
import DashboardBreadcrumb from "@/components/dashboard/DashboardBreadcrumb";

export const dynamic = "force-dynamic";

export default async function QuestionsPage() {
  const questions = getAllQuestions();
  const projects = getProjectList();

  // Build a map of projectId -> customerName for display
  const projectMap = new Map(projects.map((p) => [p.id, p.customerName]));

  const questionsWithNames = questions.map((q) => ({
    ...q,
    customerName: projectMap.get(q.projectId) || q.projectId,
  }));

  return (
    <div>
      <DashboardBreadcrumb items={[{ label: "Questions" }]} />
      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="mb-6">
          <h1 className="text-xl font-semibold text-esm-black">Questions</h1>
          <p className="text-sm text-esm-grey mt-1">
            Manage customer questions across all projects
          </p>
        </div>
        <QuestionsManager questions={questionsWithNames} />
      </div>
    </div>
  );
}
