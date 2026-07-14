import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { checkAndSendNotifications } from "@/lib/notifications";
import { logAudit } from "@/lib/audit-log";

export async function POST() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const summary = await checkAndSendNotifications();
    const actor = session.user.email || "unknown";
    for (const s of summary.sent) {
      logAudit(actor, "send_notification", s.customerName, "notification", `${s.itemCount} action items`);
    }
    if (summary.sent.length === 0 && summary.errors.length === 0) {
      logAudit(actor, "send_notification", "all", "notification", "No notifications needed");
    }
    return NextResponse.json(summary);
  } catch (error) {
    console.error("Notification send error:", error);
    return NextResponse.json(
      { error: "Failed to send notifications" },
      { status: 500 },
    );
  }
}
