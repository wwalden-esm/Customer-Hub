import { createJsonStore } from "@/lib/data-store";
import {
  getSheet,
  columnIdMap,
  addRows,
  getFolder,
  createSheetInFolder,
} from "./smartsheet";
import { getSmartsheetConfig } from "./smartsheet-data";

export interface MilestoneComment {
  id: string;
  rowId?: number;
  projectId: string;
  milestoneId: string;
  message: string;
  authorName: string;
  authorEmail: string;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// JSON fallback
// ---------------------------------------------------------------------------

const store = createJsonStore<MilestoneComment[]>("milestone-comments", []);

function load(): MilestoneComment[] {
  return store.load();
}

function save(comments: MilestoneComment[]) {
  store.save(comments);
}

// ---------------------------------------------------------------------------
// Smartsheet
// ---------------------------------------------------------------------------

const COMMENTS_COLUMNS = [
  { title: "ID", type: "TEXT_NUMBER", primary: true },
  { title: "Milestone ID", type: "TEXT_NUMBER" },
  { title: "Message", type: "TEXT_NUMBER" },
  { title: "Author Name", type: "TEXT_NUMBER" },
  { title: "Author Email", type: "TEXT_NUMBER" },
  { title: "Created At", type: "TEXT_NUMBER" },
];

async function findShareableFolder(customerFolderId: string): Promise<number> {
  const folder = await getFolder(customerFolderId);
  const shareable = folder.folders?.find((f) =>
    /shareable.*customer/i.test(f.name),
  );
  if (shareable) return shareable.id;
  return Number(customerFolderId);
}

async function ensureCommentsSheet(projectId: string): Promise<string | null> {
  const config = getSmartsheetConfig(projectId);
  if (config.milestoneCommentsSheetId) return config.milestoneCommentsSheetId;
  if (!config.customerFolderId) return null;

  try {
    const parentFolderId = await findShareableFolder(config.customerFolderId);
    const sheet = await createSheetInFolder(parentFolderId, {
      name: "Milestone Comments",
      columns: COMMENTS_COLUMNS,
    });
    const { saveSmartsheetConfigField } = await import("./smartsheet-data");
    saveSmartsheetConfigField(projectId, "milestoneCommentsSheetId", String(sheet.id));
    return String(sheet.id);
  } catch (e) {
    console.error(`Failed to create milestone comments sheet for ${projectId}:`, e);
    return null;
  }
}

async function readSheetComments(sheetId: string, projectId: string): Promise<MilestoneComment[]> {
  const sheet = await getSheet(sheetId);
  const cols = columnIdMap(sheet);
  const col = (name: string) => cols.get(name);

  return sheet.rows.map((row) => {
    const cell = (colName: string) => {
      const cId = col(colName);
      if (!cId) return "";
      const c = row.cells.find((c) => c.columnId === cId);
      return String(c?.displayValue ?? c?.value ?? "");
    };
    return {
      id: cell("ID") || `row-${row.id}`,
      rowId: row.id,
      projectId,
      milestoneId: cell("Milestone ID"),
      message: cell("Message"),
      authorName: cell("Author Name"),
      authorEmail: cell("Author Email"),
      createdAt: cell("Created At"),
    };
  }).sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
}

async function addSheetComment(
  sheetId: string,
  projectId: string,
  milestoneId: string,
  message: string,
  authorName: string,
  authorEmail: string,
): Promise<MilestoneComment> {
  const sheet = await getSheet(sheetId);
  const cols = columnIdMap(sheet);
  const id = `mc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const createdAt = new Date().toISOString();

  const cells = [
    { columnId: cols.get("ID")!, value: id },
    { columnId: cols.get("Milestone ID")!, value: milestoneId },
    { columnId: cols.get("Message")!, value: message },
    { columnId: cols.get("Author Name")!, value: authorName },
    { columnId: cols.get("Author Email")!, value: authorEmail },
    { columnId: cols.get("Created At")!, value: createdAt },
  ].filter((c) => c.columnId);

  const addedRows = await addRows(sheetId, [{ cells }]);

  return {
    id,
    rowId: addedRows[0]?.id,
    projectId,
    milestoneId,
    message,
    authorName,
    authorEmail,
    createdAt,
  };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function getMilestoneComments(projectId: string, milestoneId: string): MilestoneComment[] {
  return load()
    .filter((c) => c.projectId === projectId && c.milestoneId === milestoneId)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
}

export function getProjectMilestoneComments(projectId: string): MilestoneComment[] {
  return load()
    .filter((c) => c.projectId === projectId)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
}

export async function getProjectMilestoneCommentsAsync(projectId: string): Promise<MilestoneComment[]> {
  const config = getSmartsheetConfig(projectId);
  if (config.milestoneCommentsSheetId) {
    try {
      return await readSheetComments(config.milestoneCommentsSheetId, projectId);
    } catch (e) {
      console.error("Failed to read milestone comments from Smartsheet, falling back to JSON:", e);
    }
  }
  return getProjectMilestoneComments(projectId);
}

export function addMilestoneComment(
  projectId: string,
  milestoneId: string,
  message: string,
  authorName: string,
  authorEmail: string,
): MilestoneComment {
  const all = load();
  const comment: MilestoneComment = {
    id: `mc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    projectId,
    milestoneId,
    message,
    authorName,
    authorEmail,
    createdAt: new Date().toISOString(),
  };
  all.push(comment);
  save(all);

  // Fire-and-forget Smartsheet write
  ensureCommentsSheet(projectId).then((sheetId) => {
    if (!sheetId) return;
    addSheetComment(sheetId, projectId, milestoneId, message, authorName, authorEmail).catch((e) =>
      console.error("Failed to write milestone comment to Smartsheet:", e),
    );
  });

  return comment;
}
