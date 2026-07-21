import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getCustomerSession } from "@/lib/magic-link";
import { getProjectById } from "@/lib/smartsheet-data";
import {
  getProjectSuppliers,
  addSupplier,
  updateSupplier,
  deleteSupplier,
  getSupplierStats,
} from "@/lib/supplier-store";
import { addHubNotification } from "@/lib/hub-notification-store";
import { logAudit } from "@/lib/audit-log";
import type { SupplierCatalogType, SupplierStatus } from "@/types/models";

const VALID_CATALOG_TYPES: SupplierCatalogType[] = ["punchout", "hosted", "level2", "other"];
const VALID_STATUSES: SupplierStatus[] = [
  "requested", "outreach", "in_progress", "testing", "production", "on_hold", "cancelled",
];

function extractProjectId(req: NextRequest): string {
  return req.nextUrl.pathname.split("/")[3];
}

export async function GET(req: NextRequest) {
  const session = await auth();
  const customerSession = await getCustomerSession();
  if (!session?.user && !customerSession) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const projectId = extractProjectId(req);
  const project = getProjectById(projectId);
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  if (customerSession && customerSession.projectId !== projectId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const suppliers = getProjectSuppliers(projectId);
  const stats = getSupplierStats(projectId);
  return NextResponse.json({ suppliers, stats });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  const customerSession = await getCustomerSession();
  if (!session?.user && !customerSession) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const projectId = extractProjectId(req);
  const project = getProjectById(projectId);
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  if (customerSession && customerSession.projectId !== projectId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { supplierName, catalogType, contactName, contactEmail, notes, targetGoLive } = body;

  if (!supplierName || typeof supplierName !== "string" || !supplierName.trim()) {
    return NextResponse.json({ error: "Supplier name is required" }, { status: 400 });
  }
  if (!catalogType || !VALID_CATALOG_TYPES.includes(catalogType)) {
    return NextResponse.json(
      { error: `Catalog type must be one of: ${VALID_CATALOG_TYPES.join(", ")}` },
      { status: 400 },
    );
  }

  const actorName = customerSession?.name || session?.user?.name || "Unknown";
  const isCustomer = !!customerSession;

  const supplier = addSupplier(projectId, {
    supplierName: supplierName.trim(),
    catalogType,
    contactName,
    contactEmail,
    seAssignee: isCustomer ? undefined : body.seAssignee,
    notes: notes || "",
    requestedBy: actorName,
    targetGoLive,
  });

  if (isCustomer) {
    addHubNotification(
      projectId,
      "New supplier requested",
      `${actorName} requested ${supplierName.trim()} (${catalogType}) for catalog enablement`,
    );
  }

  logAudit(actorName, "CONFIG_UPDATED", projectId, "project", `Added supplier: ${supplierName.trim()}`);

  return NextResponse.json({ success: true, supplier }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const projectId = extractProjectId(req);
  const project = getProjectById(projectId);
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const body = await req.json();
  const { supplierId, ...updates } = body;

  if (!supplierId || typeof supplierId !== "string") {
    return NextResponse.json({ error: "supplierId is required" }, { status: 400 });
  }

  if (updates.catalogType && !VALID_CATALOG_TYPES.includes(updates.catalogType)) {
    return NextResponse.json({ error: "Invalid catalog type" }, { status: 400 });
  }
  if (updates.status && !VALID_STATUSES.includes(updates.status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const updated = updateSupplier(supplierId, updates);
  if (!updated) {
    return NextResponse.json({ error: "Supplier not found" }, { status: 404 });
  }

  const actorName = session.user.name || session.user.email || "Unknown";

  if (updates.status) {
    addHubNotification(
      projectId,
      "Supplier status updated",
      `${updated.supplierName} moved to ${updates.status.replace(/_/g, " ")}`,
    );
  }

  logAudit(actorName, "CONFIG_UPDATED", projectId, "project", `Updated supplier: ${updated.supplierName}`);

  return NextResponse.json({ success: true, supplier: updated });
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const projectId = extractProjectId(req);
  const { supplierId } = await req.json();

  if (!supplierId) {
    return NextResponse.json({ error: "supplierId is required" }, { status: 400 });
  }

  const deleted = deleteSupplier(supplierId);
  if (!deleted) {
    return NextResponse.json({ error: "Supplier not found" }, { status: 404 });
  }

  const actorName = session.user.name || session.user.email || "Unknown";
  logAudit(actorName, "CONFIG_UPDATED", projectId, "project", `Deleted supplier: ${supplierId}`);

  return NextResponse.json({ success: true });
}
