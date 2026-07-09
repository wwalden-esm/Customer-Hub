import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getProjectActivitySummary } from "@/lib/portal-activity";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const summary = getProjectActivitySummary(id);
  return NextResponse.json(summary);
}
