import { NextRequest, NextResponse } from "next/server";
import { provisionFromHubSpotRecord } from "@/lib/hub-provisioning";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // HubSpot webhooks send an array of events
    const events = Array.isArray(body) ? body : [body];

    let totalCreated = 0;

    for (const event of events) {
      const objectId = event.objectId?.toString();
      if (!objectId) continue;

      // Only act on property changes where create_customer_hub was updated
      if (event.propertyName && event.propertyName !== "create_customer_hub") {
        continue;
      }

      const result = await provisionFromHubSpotRecord(objectId);
      totalCreated += result.created.length;
    }

    return NextResponse.json({ processed: events.length, created: totalCreated });
  } catch (error) {
    console.error("HubSpot webhook error:", error);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 },
    );
  }
}
