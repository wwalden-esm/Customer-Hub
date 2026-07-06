import { NextRequest, NextResponse } from "next/server";
import { getCustomerSession } from "@/lib/magic-link";
import { getProjectById } from "@/lib/smartsheet-data";
import { isSharePointConfigured, listCustomerFolderFiles } from "@/lib/sharepoint";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await getCustomerSession();
  if (!session || session.projectId !== params.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const project = getProjectById(params.id);
  if (!project) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (!isSharePointConfigured()) {
    return NextResponse.json({ configured: false, files: [] });
  }

  const files = await listCustomerFolderFiles(project.customerName, "Meeting Notes");
  return NextResponse.json({ configured: true, files });
}
