import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createMagicLinkToken } from "@/lib/magic-link";
import { getProjectContacts } from "@/lib/smartsheet-data";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const projectId = req.nextUrl.pathname.split("/")[3];
  const contacts = getProjectContacts(projectId);

  return NextResponse.json({ contacts });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const projectId = req.nextUrl.pathname.split("/")[3];
  const { email } = await req.json();

  if (!email) {
    return NextResponse.json({ error: "Email required" }, { status: 400 });
  }

  const contacts = getProjectContacts(projectId);
  const contact = contacts.find((c) => c.email.toLowerCase() === email.toLowerCase());

  if (!contact) {
    return NextResponse.json({ error: "Contact not found on this project" }, { status: 404 });
  }

  const token = await createMagicLinkToken(projectId, contact.email);
  const baseUrl = req.nextUrl.origin;
  const inviteUrl = `${baseUrl}/hub/verify?token=${token}`;

  return NextResponse.json({ inviteUrl, expiresIn: "24 hours" });
}
