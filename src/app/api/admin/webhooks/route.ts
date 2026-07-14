import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

const SS_BASE = "https://api.smartsheet.com/2.0";

async function ssFetch<T>(path: string, opts?: RequestInit): Promise<T> {
  const token = process.env.SMARTSHEET_ACCESS_TOKEN;
  if (!token) throw new Error("SMARTSHEET_ACCESS_TOKEN not set");
  const res = await fetch(`${SS_BASE}${path}`, {
    ...opts,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...opts?.headers,
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Smartsheet API error ${res.status}: ${text}`);
  }
  return res.json();
}

export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const data = await ssFetch<{ data: unknown[] }>("/webhooks");
    return NextResponse.json(data.data || []);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to list webhooks" },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { sheetId, callbackUrl } = await req.json();
  if (!sheetId || !callbackUrl) {
    return NextResponse.json({ error: "sheetId and callbackUrl required" }, { status: 400 });
  }

  try {
    const webhook = await ssFetch<{ result: unknown }>("/webhooks", {
      method: "POST",
      body: JSON.stringify({
        name: `Hub webhook for sheet ${sheetId}`,
        callbackUrl,
        scope: "sheet",
        scopeObjectId: Number(sheetId),
        events: ["*.*"],
        version: 1,
      }),
    });
    return NextResponse.json(webhook.result);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to create webhook" },
      { status: 500 },
    );
  }
}
