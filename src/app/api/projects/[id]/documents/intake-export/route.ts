import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getProjectById } from "@/lib/smartsheet-data";
import { generateIntakeDocx } from "@/lib/documents/intake-export";
import { getCustomerSession } from "@/lib/magic-link";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id: projectId } = await ctx.params;

  const staffSession = await auth();
  const customerSession = await getCustomerSession();
  if (!staffSession?.user && (!customerSession || customerSession.projectId !== projectId)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const project = getProjectById(projectId);
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const buffer = await generateIntakeDocx({
    project: {
      customerName: project.customerName,
      projectName: project.projectName,
      startDate: null,
      goLiveDate: project.goLiveDate ? new Date(project.goLiveDate) : null,
      intakeCompletePercent: 0,
      smartsheetSubmitted: false,
      smartsheetSubmittedAt: null,
      sc: { name: project.scName },
      pm: project.pmName ? { name: project.pmName } : null,
    },
    sections: [],
    uploads: [],
  });

  const fileName = `${project.customerName.replace(/[^a-zA-Z0-9]/g, "_")}_Intake_Export.docx`;

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="${fileName}"`,
    },
  });
}
