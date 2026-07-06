import { NextRequest, NextResponse } from "next/server";
import { getAttachmentUrl } from "@/lib/smartsheet";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; docId: string }> },
) {
  const { docId } = await params;

  try {
    const { url } = await getAttachmentUrl(docId);
    return NextResponse.redirect(url);
  } catch {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }
}
