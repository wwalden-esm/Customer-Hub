import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getCustomerSession } from "@/lib/magic-link";
import { getFeedbackForProject, addFeedback } from "@/lib/milestone-feedback";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  const customerSession = await getCustomerSession();
  if (!session?.user && !customerSession) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const feedback = getFeedbackForProject(id);
  return NextResponse.json(feedback);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  const customerSession = await getCustomerSession();
  if (!session?.user && !customerSession) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();
  const { milestoneId, rating } = body;

  if (!milestoneId || !rating || !["positive", "negative"].includes(rating)) {
    return NextResponse.json(
      { error: "milestoneId and rating (positive|negative) required" },
      { status: 400 },
    );
  }

  const contactName =
    body.contactName || session?.user?.name || customerSession?.name || "Unknown";
  const contactEmail =
    body.contactEmail || session?.user?.email || customerSession?.email || "unknown";

  const feedback = addFeedback(id, milestoneId, rating, contactName, contactEmail);
  return NextResponse.json(feedback);
}
