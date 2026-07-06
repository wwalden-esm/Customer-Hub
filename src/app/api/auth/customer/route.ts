import { NextRequest, NextResponse } from "next/server";
import { getProjectPassword } from "@/lib/smartsheet-data";
import { createSessionToken, setCustomerSessionCookie } from "@/lib/magic-link";

export async function POST(req: NextRequest) {
  const { projectId, password, name } = await req.json();

  if (!projectId || !password) {
    return NextResponse.json({ error: "Project ID and password required" }, { status: 400 });
  }

  const correctPassword = getProjectPassword(projectId);
  if (!correctPassword || password !== correctPassword) {
    return NextResponse.json({ error: "Invalid project ID or password" }, { status: 401 });
  }

  const token = await createSessionToken(projectId, "customer@portal", name || "Customer");
  await setCustomerSessionCookie(token);

  return NextResponse.json({ success: true, projectId });
}
