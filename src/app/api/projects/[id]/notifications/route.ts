import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getCustomerSession } from "@/lib/magic-link";
import { getSmartsheetConfig, getProjectActivity } from "@/lib/smartsheet-data";

export async function GET(req: NextRequest) {
  const session = await auth();
  const customerSession = await getCustomerSession();
  if (!session?.user && !customerSession) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const projectId = req.nextUrl.pathname.split("/")[3];
  const config = getSmartsheetConfig(projectId);

  try {
    const activity = await getProjectActivity(config);

    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const recent = activity
      .filter((e) => new Date(e.timestamp).getTime() > sevenDaysAgo)
      .slice(0, 20);

    const notifications = recent.map((e) => ({
      id: e.id,
      title: e.title,
      detail: e.detail || "",
      timestamp: e.timestamp,
      read: false,
    }));

    return NextResponse.json({ notifications });
  } catch {
    return NextResponse.json({ notifications: [] });
  }
}
