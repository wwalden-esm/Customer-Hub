import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getProjectById } from "@/lib/smartsheet-data";
import { createSessionToken, setCustomerSessionCookie } from "@/lib/magic-link";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const projectId = req.nextUrl.pathname.split("/")[3];
  const project = getProjectById(projectId);
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const staffName = session.user.name || "ESM Staff";
  const staffEmail = session.user.email || "staff@esmsolutions.com";

  const token = await createSessionToken(projectId, staffEmail, `${staffName} (Preview)`);
  await setCustomerSessionCookie(token);

  return NextResponse.json({ success: true, redirectUrl: "/hub" });
}
