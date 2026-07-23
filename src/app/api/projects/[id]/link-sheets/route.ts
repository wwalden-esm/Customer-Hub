import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { linkSmartsheetSheets } from "@/lib/hub-provisioning";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await linkSmartsheetSheets(id);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to link sheets";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
