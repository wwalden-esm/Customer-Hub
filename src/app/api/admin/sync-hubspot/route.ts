import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { syncFromHubSpot } from "@/lib/hub-provisioning";

export async function POST() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await syncFromHubSpot();
    return NextResponse.json(result);
  } catch (error) {
    console.error("HubSpot sync error:", error);
    return NextResponse.json(
      { error: "Failed to sync from HubSpot" },
      { status: 500 },
    );
  }
}
