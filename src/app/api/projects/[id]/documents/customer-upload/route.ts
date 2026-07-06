import { NextRequest, NextResponse } from "next/server";
import { getSmartsheetConfig } from "@/lib/smartsheet-data";
import { attachFileToSheet } from "@/lib/smartsheet";

const MAX_FILE_SIZE = 25 * 1024 * 1024;

const MIME_MAP: Record<string, string> = {
  ".pdf": "application/pdf",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ".xls": "application/vnd.ms-excel",
  ".csv": "text/csv",
  ".txt": "text/plain",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
};

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const config = getSmartsheetConfig(id);
  if (!config.documentSheetId) {
    return NextResponse.json(
      { error: "Document storage not configured for this project" },
      { status: 400 },
    );
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      { error: `File too large: ${(file.size / 1024 / 1024).toFixed(1)}MB. Maximum: 25MB` },
      { status: 400 },
    );
  }

  const ext = file.name.includes(".")
    ? `.${file.name.split(".").pop()!.toLowerCase()}`
    : "";
  const contentType = MIME_MAP[ext] || "application/octet-stream";

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await attachFileToSheet(
      config.documentSheetId,
      file.name,
      contentType,
      buffer,
    );

    return NextResponse.json({
      id: result.id,
      name: result.name,
      sizeBytes: file.size,
    });
  } catch (error) {
    console.error("Customer upload failed:", error);
    return NextResponse.json(
      { error: "Failed to upload file" },
      { status: 500 },
    );
  }
}
