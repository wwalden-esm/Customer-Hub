import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getCustomerSession } from "@/lib/magic-link";
import { getAttachmentUrl } from "@/lib/smartsheet";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; docId: string }> },
) {
  const session = await auth();
  const customerSession = await getCustomerSession();
  if (!session?.user && !customerSession) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { docId } = await params;

  try {
    const { url } = await getAttachmentUrl(docId);
    return NextResponse.redirect(url);
  } catch {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }
}
