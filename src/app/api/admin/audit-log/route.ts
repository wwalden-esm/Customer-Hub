import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getAuditLog } from "@/lib/audit-log";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const category = url.searchParams.get("category") as "auth" | "user" | "config" | "notification" | "project" | "question" | null;
  const limit = parseInt(url.searchParams.get("limit") || "100", 10);

  const entries = getAuditLog({
    category: category || undefined,
    limit: Math.min(limit, 500),
  });

  return NextResponse.json(entries);
}
