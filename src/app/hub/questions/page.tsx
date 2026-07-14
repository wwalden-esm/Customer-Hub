import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCustomerSession } from "@/lib/magic-link";
import { getProjectQuestions, getProjectQuestionsAsync } from "@/lib/question-store";
import { Card, SectionLabel, Badge } from "@/components/ui";

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

      {questions.length === 0 ? (
        <Card padding="lg" className="text-center !py-12">
          <p className="text-sm text-esm-grey mb-3">No questions yet.</p>
          <a
            href="/hub/ask"
            className="text-sm font-medium transition-colors hover:opacity-80"
            style={{ color: "var(--hub-accent, #F4333F)" }}
          >
            Ask your first question
          </a>
        </Card>
      ) : (
        <div className="space-y-3">
          {questions.map((q) => {
            const date = new Date(q.createdAt);
            const dateStr = date.toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            });
            return (
              <Card key={q.id} padding="md">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2">
                    <Badge variant={q.status === "replied" ? "success" : "warning"} pill className="text-[10px]">
                      {q.status === "replied" ? "Replied" : "Open"}
                    </Badge>
                    <span className="text-xs text-esm-muted">{q.category}</span>
                  </div>
                  <span className="text-xs text-esm-muted">{dateStr}</span>
                </div>
                <p className="text-sm font-medium text-esm-black mb-1">{q.subject}</p>
                <p className="text-sm text-esm-grey whitespace-pre-wrap">{q.message}</p>
                {q.reply && (
                  <div className="mt-3 pt-3 border-t border-esm-border">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-medium text-esm-black">
                        {q.repliedBy || "Implementation Team"}
                      </span>
                      {q.repliedAt && (
                        <span className="text-xs text-esm-muted">
                          {new Date(q.repliedAt).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                          })}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-esm-grey whitespace-pre-wrap">{q.reply}</p>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
