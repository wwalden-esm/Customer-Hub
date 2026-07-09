import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { checkAndSendNotifications } from "@/lib/notifications";

export async function POST() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const summary = await checkAndSendNotifications();
    return NextResponse.json(summary);
  } catch (error) {
    console.error("Notification send error:", error);
    return NextResponse.json(
      { error: "Failed to send notifications" },
      { status: 500 },
    );
  }
}
