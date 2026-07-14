import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getCustomerSession } from "@/lib/magic-link";
import { getSmartsheetConfig, getProjectActivity } from "@/lib/smartsheet-data";
import { getProjectHubNotifications, markHubNotificationRead } from "@/lib/hub-notification-store";

export async function GET(req: NextRequest) {
  const session = await auth();
  const customerSession = await getCustomerSession();
  if (!session?.user && !customerSession) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const projectId = req.nextUrl.pathname.split("/")[3];
  const config = getSmartsheetConfig(projectId);

  const hubNotifications = getProjectHubNotifications(projectId).map((n) => ({
    id: n.id,
    title: n.title,
    detail: n.detail,
    timestamp: n.timestamp,
    read: n.read,
  }));

  try {
    const activity = await getProjectActivity(config);

    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const recent = activity
      .filter((e) => new Date(e.timestamp).getTime() > sevenDaysAgo)
      .slice(0, 20);

    const activityNotifications = recent.map((e) => ({
      id: e.id,
      title: e.title,
      detail: e.detail || "",
      timestamp: e.timestamp,
      read: true,
    }));

    const notifications = [...hubNotifications, ...activityNotifications]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 20);

    return NextResponse.json({ notifications });
  } catch {
    return NextResponse.json({ notifications: hubNotifications });
  }
}

export async function PATCH(req: NextRequest) {
  const customerSession = await getCustomerSession();
  if (!customerSession) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { notificationId } = await req.json();
  if (notificationId) {
    markHubNotificationRead(notificationId);
  }
  return NextResponse.json({ ok: true });
}
