import { NextRequest, NextResponse } from "next/server";
import { getCustomerSession } from "@/lib/magic-link";
import { recordVisit } from "@/lib/portal-activity";

export async function POST(req: NextRequest) {
  const session = await getCustomerSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const page = typeof body.page === "string" ? body.page : "/hub";

  recordVisit(session.projectId, session.email, session.name, page);

  return NextResponse.json({ ok: true });
}
