import { NextRequest, NextResponse } from "next/server";
import { getCustomerSession } from "@/lib/magic-link";
import { auth } from "@/lib/auth";
import {
  getProjectConfirmations,
  confirmItem,
  revokeConfirmation,
} from "@/lib/checklist-store";
import { logAudit } from "@/lib/audit-log";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  const customerSession = await getCustomerSession();
  if (!session?.user && !customerSession) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const confirmations = getProjectConfirmations(id);
  return NextResponse.json(confirmations);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  const customerSession = await getCustomerSession();
  if (!session?.user && !customerSession) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const { itemKey, note } = await req.json();
  if (!itemKey) {
    return NextResponse.json({ error: "itemKey required" }, { status: 400 });
  }

  const actor =
    session?.user?.name || session?.user?.email ||
    customerSession?.name || customerSession?.email || "unknown";

  const confirmation = confirmItem(id, itemKey, actor, note);

  logAudit(actor, "confirm_checklist", id, "project", itemKey);

  return NextResponse.json(confirmation);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  const customerSession = await getCustomerSession();
  if (!session?.user && !customerSession) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const { itemKey } = await req.json();
  if (!itemKey) {
    return NextResponse.json({ error: "itemKey required" }, { status: 400 });
  }

  const actor =
    session?.user?.name || session?.user?.email ||
    customerSession?.name || customerSession?.email || "unknown";

  revokeConfirmation(id, itemKey);
  logAudit(actor, "revoke_checklist", id, "project", itemKey);

  return NextResponse.json({ ok: true });
}
