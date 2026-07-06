import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getSmartsheetConfig } from "@/lib/smartsheet-data";
import { refreshMetrics } from "@/lib/metrics-compute";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const projectId = req.nextUrl.pathname.split("/")[3];
  const config = getSmartsheetConfig(projectId);

  if (!config.metricsSheetId) {
    return NextResponse.json(
      { error: "No metrics sheet configured. Link sheets first." },
      { status: 400 },
    );
  }

  try {
    const result = await refreshMetrics(config);
    return NextResponse.json({
      ok: true,
      metrics: result.metrics,
      updated: result.updated,
      created: result.created,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to refresh metrics" },
      { status: 500 },
    );
  }
}
