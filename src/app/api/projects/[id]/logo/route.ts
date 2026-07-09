import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getSmartsheetConfig } from "@/lib/smartsheet-data";
import {
  getSheet,
  columnIdMap,
  addRows,
  attachFileToRow,
  getAttachmentUrl,
  listSheetAttachments,
  deleteAttachment,
} from "@/lib/smartsheet";
import fs from "fs";
import path from "path";

const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/svg+xml", "image/webp", "image/gif"];
const MAX_SIZE = 5 * 1024 * 1024; // 5 MB
const configPath = path.join(process.cwd(), "config", "projects.json");

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: projectId } = await params;
  const config = getSmartsheetConfig(projectId);
  if (!config.documentSheetId) {
    return NextResponse.json({ error: "No document sheet configured" }, { status: 422 });
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: "File must be an image (PNG, JPEG, SVG, WebP, or GIF)" }, { status: 400 });
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: "File must be under 5 MB" }, { status: 400 });
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const sheetId = config.documentSheetId;
    const sheet = await getSheet(sheetId);
    const cols = columnIdMap(sheet);
    const nameColId = cols.get("Document Name");

    // Find existing "Customer Logo" row or create one
    let logoRowId: number | null = null;
    if (nameColId) {
      for (const row of sheet.rows) {
        const cell = row.cells.find((c) => c.columnId === nameColId);
        if (cell && String(cell.value ?? "") === "Customer Logo") {
          logoRowId = row.id;
          break;
        }
      }
    }

    if (!logoRowId && nameColId) {
      const newRows = await addRows(sheetId, [
        { cells: [{ columnId: nameColId, value: "Customer Logo" }] },
      ]);
      logoRowId = newRows[0].id;
    }

    if (!logoRowId) {
      return NextResponse.json({ error: "Document sheet missing 'Document Name' column" }, { status: 422 });
    }

    // Remove any existing logo attachments on this row before uploading the new one
    const allAttachments = await listSheetAttachments(sheetId);
    for (const att of allAttachments) {
      if (att.name.startsWith("customer-logo.")) {
        await deleteAttachment(att.id);
      }
    }

    const ext = file.name.split(".").pop() || "png";
    const attachment = await attachFileToRow(
      sheetId,
      logoRowId,
      `customer-logo.${ext}`,
      file.type,
      buffer,
    );

    // Save the attachment ID in the project config so we can resolve it later
    const raw = fs.readFileSync(configPath, "utf-8");
    const projects = JSON.parse(raw);
    if (projects[projectId]) {
      projects[projectId].branding = {
        ...projects[projectId].branding,
        logoAttachmentId: attachment.id,
        logoUrl: `/api/projects/${projectId}/logo`,
      };
      fs.writeFileSync(configPath, JSON.stringify(projects, null, 2));
    }

    return NextResponse.json({
      attachmentId: attachment.id,
      logoUrl: `/api/projects/${projectId}/logo`,
    });
  } catch (error) {
    console.error("Logo upload failed:", error);
    return NextResponse.json({ error: "Failed to upload logo" }, { status: 500 });
  }
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: projectId } = await params;

  const raw = fs.readFileSync(configPath, "utf-8");
  const projects = JSON.parse(raw);
  const branding = projects[projectId]?.branding;
  const attachmentId = branding?.logoAttachmentId;

  if (!attachmentId) {
    return new NextResponse(null, { status: 404 });
  }

  try {
    const { url } = await getAttachmentUrl(attachmentId);
    const upstream = await fetch(url);
    if (!upstream.ok) {
      return new NextResponse(null, { status: 404 });
    }

    const contentType = upstream.headers.get("content-type") || "image/png";
    const body = await upstream.arrayBuffer();

    return new NextResponse(body, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch {
    return new NextResponse(null, { status: 404 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: projectId } = await params;

  const raw = fs.readFileSync(configPath, "utf-8");
  const projects = JSON.parse(raw);
  const branding = projects[projectId]?.branding;
  const attachmentId = branding?.logoAttachmentId;

  if (attachmentId) {
    try {
      await deleteAttachment(attachmentId);
    } catch {
      // Attachment may already be gone
    }
  }

  if (projects[projectId]) {
    delete projects[projectId].branding?.logoAttachmentId;
    delete projects[projectId].branding?.logoUrl;
    fs.writeFileSync(configPath, JSON.stringify(projects, null, 2));
  }

  return NextResponse.json({ ok: true });
}
