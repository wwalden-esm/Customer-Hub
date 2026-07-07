import { NextRequest, NextResponse } from "next/server";
import { verifyMagicLinkToken, createSessionToken, setCustomerSessionCookie } from "@/lib/magic-link";
import { getProjectContacts } from "@/lib/smartsheet-data";

export async function POST(req: NextRequest) {
  const { token } = await req.json();

  if (!token) {
    return NextResponse.json({ error: "Token required" }, { status: 400 });
  }

  try {
    const { projectId, email } = await verifyMagicLinkToken(token);

    const contacts = getProjectContacts(projectId);
    const contact = contacts.find((c) => c.email.toLowerCase() === email.toLowerCase());

    if (!contact) {
      return NextResponse.json({ error: "You are no longer authorized to access this project" }, { status: 403 });
    }

    const sessionToken = await createSessionToken(projectId, contact.email, contact.name);
    await setCustomerSessionCookie(sessionToken);

    return NextResponse.json({ success: true, projectId });
  } catch {
    return NextResponse.json({ error: "Invalid or expired link. Please request a new one from your ESM consultant." }, { status: 401 });
  }
}
