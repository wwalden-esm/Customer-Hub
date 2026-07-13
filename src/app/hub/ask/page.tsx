import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCustomerSession } from "@/lib/magic-link";
import { getProjectById } from "@/lib/smartsheet-data";
import AskQuestionForm from "@/components/hub/AskQuestionForm";

export async function generateMetadata(): Promise<Metadata> {
  return { title: "Ask a Question" };
}

export default async function AskQuestionPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const session = await getCustomerSession();
  if (!session) redirect("/hub/login");

  const project = getProjectById(session.projectId);
  if (!project) redirect("/hub/login");

  const params = await searchParams;

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-semibold text-esm-black mb-2">Ask a Question</h1>
      <p className="text-sm text-esm-grey mb-6">
        Send a message to your implementation team. Your Solutions Consultant ({project.scName}) will respond via email.
      </p>
      <AskQuestionForm
        projectId={session.projectId}
        projectName={project.projectName}
        senderName={session.name || ""}
        senderEmail={session.email || ""}
        scName={project.scName}
        initialCategory={params.category}
      />
    </div>
  );
}
