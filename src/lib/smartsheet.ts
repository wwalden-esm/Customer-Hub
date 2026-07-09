import crypto from "crypto";

const BASE = "https://api.smartsheet.com/2.0";

function token(): string {
  const t = process.env.SMARTSHEET_API_TOKEN;
  if (!t) throw new Error("SMARTSHEET_API_TOKEN not configured");
  return t;
}

export async function ssFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token()}`,
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
    cache: "no-store",
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Smartsheet ${init.method ?? "GET"} ${path} -> ${res.status}: ${body}`);
  }
  return (await res.json()) as T;
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SsCell {
  columnId: number;
  value?: string | number | boolean | null;
  displayValue?: string;
  hyperlink?: { url: string };
}

export interface SsRow {
  id: number;
  cells: SsCell[];
  rowNumber?: number;
}

export interface SsColumn {
  id: number;
  title: string;
  type: string;
  index?: number;
  primary?: boolean;
}

export interface SsSheet {
  id: number;
  name: string;
  permalink?: string;
  columns: SsColumn[];
  rows: SsRow[];
}

export interface SsFolderChild {
  id: number;
  name: string;
}

export interface SsFolder {
  id: number;
  name: string;
  folders?: SsFolderChild[];
  sheets?: SsFolderChild[];
}

// ---------------------------------------------------------------------------
// Folders & sheets
// ---------------------------------------------------------------------------

export async function getFolder(folderId: string | number): Promise<SsFolder> {
  return ssFetch<SsFolder>(`/folders/${folderId}`);
}

const permalinkCache = new Map<string, string>();

export async function getSheet(sheetId: string | number): Promise<SsSheet> {
  const sheet = await ssFetch<SsSheet>(`/sheets/${sheetId}`);
  if (sheet.permalink) permalinkCache.set(String(sheetId), sheet.permalink);
  return sheet;
}

export function getSheetPermalink(sheetId: string | number): string | undefined {
  return permalinkCache.get(String(sheetId));
}

export function findCustomerFolder(parent: SsFolder, customerName: string): SsFolderChild | null {
  const needle = customerName.toLowerCase().trim();
  if (!parent.folders) return null;
  return parent.folders.find((f) => f.name.toLowerCase().includes(needle)) ?? null;
}

export async function findCustomerAccessSheet(folderId: string | number): Promise<SsFolderChild | null> {
  const folder = await getFolder(folderId);
  if (!folder.sheets) return null;
  return folder.sheets.find((s) => /customer access/i.test(s.name)) ?? null;
}

export interface CreateSheetInput {
  name: string;
  columns: Array<{ title: string; type: string; primary?: boolean }>;
}

export async function createSheetInFolder(
  folderId: string | number,
  input: CreateSheetInput,
): Promise<{ id: number; name: string }> {
  const res = await ssFetch<{ result: { id: number; name: string } }>(`/folders/${folderId}/sheets`, {
    method: "POST",
    body: JSON.stringify(input),
  });
  return res.result;
}

export async function createFolderInWorkspace(
  workspaceId: string | number,
  name: string,
): Promise<{ id: number; name: string }> {
  const res = await ssFetch<{ result: { id: number; name: string } }>(`/workspaces/${workspaceId}/folders`, {
    method: "POST",
    body: JSON.stringify({ name }),
  });
  return res.result;
}

export async function createFolderInFolder(
  parentFolderId: string | number,
  name: string,
): Promise<{ id: number; name: string }> {
  const res = await ssFetch<{ result: { id: number; name: string } }>(`/folders/${parentFolderId}/folders`, {
    method: "POST",
    body: JSON.stringify({ name }),
  });
  return res.result;
}

// ---------------------------------------------------------------------------
// Workspaces
// ---------------------------------------------------------------------------

export async function copyWorkspace(
  sourceWorkspaceId: string | number,
  newName: string,
): Promise<{ id: number; name: string }> {
  const res = await ssFetch<{ result: { id: number; name: string } }>(
    `/workspaces/${sourceWorkspaceId}/copy`,
    {
      method: "POST",
      body: JSON.stringify({ newName }),
    },
  );
  return res.result;
}

export async function copySheetToFolder(
  sourceSheetId: string | number,
  destinationFolderId: string | number,
  newName: string,
): Promise<{ id: number; name: string; permalink?: string }> {
  const includes = "data,attachments,discussions,cellLinks,forms,rules,ruleRecipients";
  const res = await ssFetch<{ result: { id: number; name: string; permalink?: string } }>(
    `/sheets/${sourceSheetId}/copy?include=${includes}`,
    {
      method: "POST",
      body: JSON.stringify({
        destinationType: "folder",
        destinationId: Number(destinationFolderId),
        newName,
      }),
    },
  );
  return res.result;
}

// ---------------------------------------------------------------------------
// Columns & rows
// ---------------------------------------------------------------------------

export function columnIdMap(sheet: SsSheet): Map<string, number> {
  const m = new Map<string, number>();
  for (const c of sheet.columns) m.set(c.title, c.id);
  return m;
}

export function cellValue(row: SsRow, columnId: number): string | null {
  const c = row.cells.find((x) => x.columnId === columnId);
  if (!c || c.value == null) return null;
  return String(c.value);
}

export async function addRows(sheetId: string | number, rows: { cells: SsCell[] }[]): Promise<SsRow[]> {
  const res = await ssFetch<{ result: SsRow[] }>(`/sheets/${sheetId}/rows`, {
    method: "POST",
    body: JSON.stringify(rows),
  });
  return res.result;
}

export async function updateRows(
  sheetId: string | number,
  rows: Array<{ id: number; cells: SsCell[] }>,
): Promise<SsRow[]> {
  const res = await ssFetch<{ result: SsRow[] }>(`/sheets/${sheetId}/rows`, {
    method: "PUT",
    body: JSON.stringify(rows),
  });
  return res.result;
}

export async function upsertCustomerAccessRow(
  sheetId: string | number,
  rowValues: Record<string, string | null | undefined>,
): Promise<{ created: boolean; rowId: number }> {
  const sheet = await getSheet(sheetId);
  const cols = columnIdMap(sheet);
  const resourceColId = cols.get("Resource");
  if (!resourceColId) throw new Error(`Customer Access sheet ${sheetId} is missing a Resource column`);

  const cells: SsCell[] = [];
  for (const [title, value] of Object.entries(rowValues)) {
    const colId = cols.get(title);
    if (colId === undefined) continue;
    cells.push({ columnId: colId, value: value ?? null });
  }

  const resourceVal = rowValues["Resource"] ?? "";
  const existing = sheet.rows.find((r) =>
    r.cells.some((c) => c.columnId === resourceColId && String(c.value ?? "") === resourceVal),
  );
  if (existing) {
    const updated = await updateRows(sheetId, [{ id: existing.id, cells }]);
    return { created: false, rowId: updated[0].id };
  }
  const added = await addRows(sheetId, [{ cells }]);
  return { created: true, rowId: added[0].id };
}

// ---------------------------------------------------------------------------
// Attachments
// ---------------------------------------------------------------------------

export async function attachFileToSheet(
  sheetId: string | number,
  fileName: string,
  contentType: string,
  buffer: Buffer | ArrayBuffer | Uint8Array,
): Promise<{ id: number; name: string }> {
  const body = buffer instanceof Uint8Array || buffer instanceof ArrayBuffer ? buffer : new Uint8Array(buffer);
  const res = await fetch(`${BASE}/sheets/${sheetId}/attachments`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token()}`,
      "Content-Type": contentType,
      "Content-Disposition": `attachment; filename="${fileName.replace(/"/g, "")}"`,
      "Content-Length": String((body as Uint8Array).byteLength),
    },
    body: body as BodyInit,
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Smartsheet attach to sheet ${sheetId} failed: ${res.status} ${t}`);
  }
  const json = (await res.json()) as { result: { id: number; name: string } };
  return json.result;
}

export interface SsAttachment {
  id: number;
  name: string;
  sizeInKb?: number;
  mimeType?: string;
  createdAt?: string;
}

export async function listSheetAttachments(sheetId: string | number): Promise<SsAttachment[]> {
  const res = await ssFetch<{ data: SsAttachment[] }>(`/sheets/${sheetId}/attachments`);
  return res.data ?? [];
}

export async function getAttachmentUrl(attachmentId: string | number): Promise<{ url: string; name: string }> {
  return ssFetch<{ url: string; name: string }>(`/attachments/${attachmentId}`);
}

export async function attachFileToRow(
  sheetId: string | number,
  rowId: string | number,
  fileName: string,
  contentType: string,
  buffer: Buffer | ArrayBuffer | Uint8Array,
): Promise<{ id: number; name: string }> {
  const body = buffer instanceof Uint8Array || buffer instanceof ArrayBuffer ? buffer : new Uint8Array(buffer);
  const res = await fetch(`${BASE}/sheets/${sheetId}/rows/${rowId}/attachments`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token()}`,
      "Content-Type": contentType,
      "Content-Disposition": `attachment; filename="${fileName.replace(/"/g, "")}"`,
      "Content-Length": String((body as Uint8Array).byteLength),
    },
    body: body as BodyInit,
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Smartsheet attach to row ${rowId} on sheet ${sheetId} failed: ${res.status} ${t}`);
  }
  const json = (await res.json()) as { result: { id: number; name: string } };
  return json.result;
}

export async function deleteAttachment(attachmentId: string | number): Promise<void> {
  await fetch(`${BASE}/attachments/${attachmentId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token()}` },
  });
}

// ---------------------------------------------------------------------------
// Webhook signature verification
// ---------------------------------------------------------------------------

export function verifyWebhookSignature(rawBody: string, signature: string | null, secret: string): boolean {
  if (!signature || !secret) return false;
  const computed = crypto.createHmac("sha256", secret).update(rawBody, "utf8").digest("hex");
  const a = Buffer.from(computed, "utf8");
  const b = Buffer.from(signature, "utf8");
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}
