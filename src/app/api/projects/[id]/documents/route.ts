import { NextResponse } from "next/server";
import { getSmartsheetConfig, getProjectDocuments } from "@/lib/smartsheet-data";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id: projectId } = await ctx.params;

  const config = getSmartsheetConfig(projectId);
  if (!config.documentSheetId) {
    return NextResponse.json([]);
  }

  const documents = await getProjectDocuments(config.documentSheetId);
  return NextResponse.json(documents);
}
