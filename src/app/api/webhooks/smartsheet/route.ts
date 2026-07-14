import { NextRequest, NextResponse } from "next/server";
import { logAudit } from "@/lib/audit-log";

export async function POST(req: NextRequest) {
  const body = await req.json();

  // Smartsheet sends a verification request when registering a webhook
  // Respond with the challenge to confirm the endpoint
  if (body.challenge) {
    return NextResponse.json({ smartsheetHookResponse: body.challenge });
  }

  // Smartsheet webhook events
  if (body.events && Array.isArray(body.events)) {
    const scopeObjectId = body.scopeObjectId;

    for (const event of body.events) {
      const { objectType, eventType, rowId, columnId } = event;

      logAudit(
        "smartsheet-webhook",
        `webhook_${eventType}`,
        String(scopeObjectId),
        "project",
        `${objectType} ${eventType}${rowId ? ` row:${rowId}` : ""}${columnId ? ` col:${columnId}` : ""}`,
      );
    }

    // Webhook events we care about:
    // - row.created / row.updated / row.deleted on project plan sheets (milestones)
    // - row.created / row.updated on action item sheets
    // - row.created / row.updated on RAID log sheets
    // - attachment.created on document sheets
    //
    // In a production system, these would trigger cache invalidation
    // or push notifications. For now we log them for audit visibility.

    return NextResponse.json({
      ok: true,
      processed: body.events.length,
    });
  }

  // Smartsheet status callback (webhook enabled/disabled)
  if (body.newWebhookStatus) {
    logAudit(
      "smartsheet-webhook",
      "webhook_status_change",
      String(body.webhookId || "unknown"),
      "config",
      `Status: ${body.newWebhookStatus}`,
    );
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ ok: true });
}

// Smartsheet also sends HEAD requests to verify the endpoint
export async function HEAD() {
  return new NextResponse(null, { status: 200 });
}
