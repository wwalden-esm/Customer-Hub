import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { ssFetch } from "@/lib/smartsheet";

export async function POST() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Simple test: fetch current user info from Smartsheet API
    const result = await ssFetch<{ email: string }>("/users/me");
    return NextResponse.json({ ok: true, email: result.email });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Connection failed";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
