import { NextResponse } from "next/server";
import { getCustomerSession } from "@/lib/magic-link";

export async function GET() {
  const session = await getCustomerSession();
  if (!session) {
    return NextResponse.json({ valid: false }, { status: 401 });
  }
  return NextResponse.json({ valid: true });
}
