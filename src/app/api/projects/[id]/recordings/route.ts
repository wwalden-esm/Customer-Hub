import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getCustomerSession } from "@/lib/magic-link";
import { getProjectById } from "@/lib/smartsheet-data";
import { isSharePointConfigured, listCustomerFolderFiles } from "@/lib/sharepoint";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const staffSession = await auth();
  const customerSession = await getCustomerSession();
  if (!staffSession?.user && (!customerSession || customerSession.projectId !== id)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const project = getProjectById(id);
  if (!project) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (!isSharePointConfigured()) {
    return NextResponse.json({ configured: false, files: [] });
  }

  const files = await listCustomerFolderFiles(project.customerName, "Meeting Notes");
  return NextResponse.json({ configured: true, files });
}
