import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getCustomerSession } from "@/lib/magic-link";
import { getSmartsheetConfig, getProjectDocuments } from "@/lib/smartsheet-data";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  const customerSession = await getCustomerSession();
  if (!session?.user && !customerSession) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: projectId } = await ctx.params;

  const config = getSmartsheetConfig(projectId);
  if (!config.documentSheetId) {
    return NextResponse.json([]);
  }

  const documents = await getProjectDocuments(config.documentSheetId);
  return NextResponse.json(documents);
}
