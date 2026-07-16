import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { sendWeeklyDigests } from "@/lib/weekly-digest";
import { logAudit } from "@/lib/audit-log";

export async function POST() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const summary = await sendWeeklyDigests();
    const actor = session.user.email || "unknown";

    logAudit(
      actor,
      "weekly_digest_triggered",
      "all",
      "notification",
      `Sent: ${summary.sent.length}, Skipped: ${summary.skipped.length}, Errors: ${summary.errors.length}`,
    );

    return NextResponse.json(summary);
  } catch (error) {
    console.error("Weekly digest error:", error);
    return NextResponse.json(
      { error: "Failed to send weekly digests" },
      { status: 500 },
    );
  }
}
