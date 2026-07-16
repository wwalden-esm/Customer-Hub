import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { runAllChecks } from "@/lib/notification-triggers";
import { logAudit } from "@/lib/audit-log";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const summary = await runAllChecks();
    const actor = session.user.email || "unknown";
    logAudit(
      actor,
      "check_notifications",
      "all",
      "notification",
      `overdue=${summary.overdueCount} upcoming=${summary.upcomingCount} unanswered=${summary.unansweredCount}`,
    );
    return NextResponse.json(summary);
  } catch (error) {
    console.error("Notification check error:", error);
    return NextResponse.json(
      { error: "Failed to run notification checks" },
      { status: 500 },
    );
  }
}
