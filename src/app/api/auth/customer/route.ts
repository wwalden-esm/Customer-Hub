import { NextRequest, NextResponse } from "next/server";
import { getProjectPassword, getProjectContacts } from "@/lib/smartsheet-data";
import { createSessionToken, setCustomerSessionCookie } from "@/lib/magic-link";

export async function POST(req: NextRequest) {
  const { projectId, password, contactEmail } = await req.json();

  if (!projectId || !password) {
    return NextResponse.json({ error: "Project ID and password required" }, { status: 400 });
  }

  const correctPassword = getProjectPassword(projectId);
  if (!correctPassword || password !== correctPassword) {
    return NextResponse.json({ error: "Invalid project ID or password" }, { status: 401 });
  }

  const contacts = getProjectContacts(projectId);

  if (contactEmail) {
    const contact = contacts.find((c) => c.email.toLowerCase() === contactEmail.toLowerCase());
    if (!contact) {
      return NextResponse.json({ error: "Selected contact not found" }, { status: 400 });
    }
    const token = await createSessionToken(projectId, contact.email, contact.name);
    await setCustomerSessionCookie(token);
    return NextResponse.json({ success: true, projectId });
  }

  if (contacts.length > 0) {
    return NextResponse.json({
      requireContactSelection: true,
      contacts: contacts.map((c) => ({ email: c.email, name: c.name, role: c.role })),
    });
  }

  const token = await createSessionToken(projectId, "customer@portal", "Customer");
  await setCustomerSessionCookie(token);
  return NextResponse.json({ success: true, projectId });
}
