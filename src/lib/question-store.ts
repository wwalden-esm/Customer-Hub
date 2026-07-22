import { createJsonStore } from "@/lib/data-store";
import {
  getSheet,
  columnIdMap,
  addRows,
  updateRows,
  createSheetInFolder,
  getFolder,
} from "./smartsheet";
import { getSmartsheetConfig } from "./smartsheet-data";

export interface QuestionMessage {
  id: string;
  text: string;
  authorName: string;
  authorEmail: string;
  authorType: "customer" | "staff";
  createdAt: string;
}

export interface Question {
  id: string;
  rowId?: number;
  projectId: string;
  category: string;
  subject: string;
  message: string;
  senderName: string;
  senderEmail: string;
  createdAt: string;
  status: "open" | "replied" | "closed";
  messages: QuestionMessage[];
  // Deprecated — kept for backward compat with old data
  reply?: string;
  repliedBy?: string;
  repliedAt?: string;
}

// ---------------------------------------------------------------------------
// Migration helper — converts old single-reply format to messages array
// ---------------------------------------------------------------------------

function migrateQuestion(q: Question): Question {
  if (q.messages && q.messages.length > 0) return q;

  const messages: QuestionMessage[] = [];

  // Original customer message
  messages.push({
    id: `${q.id}-msg-0`,
    text: q.message,
    authorName: q.senderName,
    authorEmail: q.senderEmail,
    authorType: "customer",
    createdAt: q.createdAt,
  });

  // Legacy reply
  if (q.reply) {
    messages.push({
      id: `${q.id}-msg-1`,
      text: q.reply,
      authorName: q.repliedBy || "Staff",
      authorEmail: "",
      authorType: "staff",
      createdAt: q.repliedAt || q.createdAt,
    });
  }

  q.messages = messages;
  return q;
}

// ---------------------------------------------------------------------------
// JSON fallback (for projects without Smartsheet)
// ---------------------------------------------------------------------------

const questionStore = createJsonStore<Question[]>("questions", []);

function loadJsonQuestions(): Question[] {
  try {
    return questionStore.load().map(migrateQuestion);
  } catch {
    return [];
  }
}

function saveJsonQuestions(questions: Question[]): void {
  questionStore.save(questions);
}

// ---------------------------------------------------------------------------
// Smartsheet questions sheet
// ---------------------------------------------------------------------------

const QUESTIONS_COLUMNS = [
  { title: "ID", type: "TEXT_NUMBER", primary: true },
  { title: "Category", type: "TEXT_NUMBER" },
  { title: "Subject", type: "TEXT_NUMBER" },
  { title: "Message", type: "TEXT_NUMBER" },
  { title: "Sender Name", type: "TEXT_NUMBER" },
  { title: "Sender Email", type: "TEXT_NUMBER" },
  { title: "Created At", type: "TEXT_NUMBER" },
  { title: "Status", type: "TEXT_NUMBER" },
  { title: "Reply", type: "TEXT_NUMBER" },
  { title: "Replied By", type: "TEXT_NUMBER" },
  { title: "Replied At", type: "TEXT_NUMBER" },
];

async function findOrCreateShareableFolder(customerFolderId: string): Promise<number> {
  const folder = await getFolder(customerFolderId);
  const shareable = folder.folders?.find((f) =>
    /shareable.*customer/i.test(f.name),
  );
  if (shareable) return shareable.id;
  return Number(customerFolderId);
}

async function ensureQuestionsSheet(projectId: string): Promise<string | null> {
  const config = getSmartsheetConfig(projectId);

  if (config.questionsSheetId) return config.questionsSheetId;
  if (!config.customerFolderId) return null;

  try {
    const parentFolderId = await findOrCreateShareableFolder(config.customerFolderId);
    const sheet = await createSheetInFolder(parentFolderId, {
      name: "Customer Questions",
      columns: QUESTIONS_COLUMNS,
    });

    // Persist the new sheet ID to the project config
    const { saveSmartsheetConfigField } = await import("./smartsheet-data");
    saveSmartsheetConfigField(projectId, "questionsSheetId", String(sheet.id));

    return String(sheet.id);
  } catch (e) {
    console.error(`Failed to create questions sheet for ${projectId}:`, e);
    return null;
  }
}

async function readSheetQuestions(sheetId: string, projectId: string): Promise<Question[]> {
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

    const q: Question = {
      id: cell("ID") || `row-${row.id}`,
      rowId: row.id,
      projectId,
      category: cell("Category"),
      subject: cell("Subject"),
      message: cell("Message"),
      senderName: cell("Sender Name"),
      senderEmail: cell("Sender Email"),
      createdAt: cell("Created At"),
      status: (cell("Status") as "open" | "replied" | "closed") || "open",
      messages: [],
      reply: cell("Reply") || undefined,
      repliedBy: cell("Replied By") || undefined,
      repliedAt: cell("Replied At") || undefined,
    };

    return migrateQuestion(q);
  }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

async function addSheetQuestion(
  sheetId: string,
  q: Omit<Question, "id" | "createdAt" | "status" | "messages">,
  existingId?: string,
  existingCreatedAt?: string,
): Promise<Question> {
  const sheet = await getSheet(sheetId);
  const cols = columnIdMap(sheet);

  const id = existingId || `q-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const createdAt = existingCreatedAt || new Date().toISOString();

  const cells = [
    { columnId: cols.get("ID")!, value: id },
    { columnId: cols.get("Category")!, value: q.category },
    { columnId: cols.get("Subject")!, value: q.subject },
    { columnId: cols.get("Message")!, value: q.message },
    { columnId: cols.get("Sender Name")!, value: q.senderName },
    { columnId: cols.get("Sender Email")!, value: q.senderEmail },
    { columnId: cols.get("Created At")!, value: createdAt },
    { columnId: cols.get("Status")!, value: "open" },
  ].filter((c) => c.columnId);

  const addedRows = await addRows(sheetId, [{ cells }]);

  return {
    ...q,
    id,
    rowId: addedRows[0]?.id,
    createdAt,
    status: "open",
    messages: [{
      id: `${id}-msg-0`,
      text: q.message,
      authorName: q.senderName,
      authorEmail: q.senderEmail,
      authorType: "customer",
      createdAt,
    }],
  };
}

async function replyOnSheet(
  sheetId: string,
  questionId: string,
  reply: string,
  repliedBy: string,
): Promise<Question | null> {
  const sheet = await getSheet(sheetId);
  const cols = columnIdMap(sheet);
  const idCol = cols.get("ID");
  if (!idCol) return null;

  const row = sheet.rows.find((r) =>
    r.cells.some((c) => c.columnId === idCol && String(c.value) === questionId),
  );
  if (!row) return null;

  const repliedAt = new Date().toISOString();
  const updates = [
    { columnId: cols.get("Reply")!, value: reply },
    { columnId: cols.get("Replied By")!, value: repliedBy },
    { columnId: cols.get("Replied At")!, value: repliedAt },
    { columnId: cols.get("Status")!, value: "replied" },
  ].filter((c) => c.columnId);

  await updateRows(sheetId, [{ id: row.id, cells: updates }]);

  const cell = (colName: string) => {
    const cId = cols.get(colName);
    if (!cId) return "";
    const c = row.cells.find((c) => c.columnId === cId);
    return String(c?.displayValue ?? c?.value ?? "");
  };

  const q: Question = {
    id: questionId,
    rowId: row.id,
    projectId: "",
    category: cell("Category"),
    subject: cell("Subject"),
    message: cell("Message"),
    senderName: cell("Sender Name"),
    senderEmail: cell("Sender Email"),
    createdAt: cell("Created At"),
    status: "replied",
    messages: [],
    reply,
    repliedBy,
    repliedAt,
  };

  return migrateQuestion(q);
}

async function updateStatusOnSheet(
  sheetId: string,
  questionId: string,
  status: string,
): Promise<boolean> {
  const sheet = await getSheet(sheetId);
  const cols = columnIdMap(sheet);
  const idCol = cols.get("ID");
  if (!idCol) return false;

  const row = sheet.rows.find((r) =>
    r.cells.some((c) => c.columnId === idCol && String(c.value) === questionId),
  );
  if (!row) return false;

  const statusCol = cols.get("Status");
  if (!statusCol) return false;

  await updateRows(sheetId, [{ id: row.id, cells: [{ columnId: statusCol, value: status }] }]);
  return true;
}

// ---------------------------------------------------------------------------
// Public API — tries Smartsheet first, falls back to JSON
// ---------------------------------------------------------------------------

export function addQuestion(q: Omit<Question, "id" | "createdAt" | "status" | "messages">): Question {
  // Synchronous JSON write for immediate return; async Smartsheet write in background
  const questions = loadJsonQuestions();
  const id = `q-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const createdAt = new Date().toISOString();
  const question: Question = {
    ...q,
    id,
    createdAt,
    status: "open",
    messages: [{
      id: `${id}-msg-0`,
      text: q.message,
      authorName: q.senderName,
      authorEmail: q.senderEmail,
      authorType: "customer",
      createdAt,
    }],
  };
  questions.push(question);
  saveJsonQuestions(questions);

  // Fire-and-forget Smartsheet write (pass same ID so JSON and Smartsheet stay in sync)
  ensureQuestionsSheet(q.projectId).then((sheetId) => {
    if (!sheetId) return;
    addSheetQuestion(sheetId, q, question.id, question.createdAt).catch((e) =>
      console.error("Failed to write question to Smartsheet:", e),
    );
  });

  return question;
}

export function addMessageToQuestion(
  questionId: string,
  msg: Omit<QuestionMessage, "id" | "createdAt">,
): Question | null {
  const questions = loadJsonQuestions();
  const q = questions.find((q) => q.id === questionId);
  if (!q) return null;

  const now = new Date().toISOString();
  const newMsg: QuestionMessage = {
    ...msg,
    id: `${questionId}-msg-${q.messages.length}`,
    createdAt: now,
  };

  q.messages.push(newMsg);

  // Update status based on who posted
  if (msg.authorType === "staff") {
    q.status = "replied";
    // Also update legacy fields for backward compat / Smartsheet sync
    q.reply = msg.text;
    q.repliedBy = msg.authorName;
    q.repliedAt = now;
  } else if (msg.authorType === "customer" && q.status === "replied") {
    // Customer follow-up reopens the thread
    q.status = "open";
  }

  saveJsonQuestions(questions);

  // Fire-and-forget Smartsheet sync
  if (msg.authorType === "staff") {
    const config = getSmartsheetConfig(q.projectId);
    if (config.questionsSheetId) {
      replyOnSheet(config.questionsSheetId, questionId, msg.text, msg.authorName).catch((e) =>
        console.error("Failed to update reply on Smartsheet:", e),
      );
    }
  } else {
    const config = getSmartsheetConfig(q.projectId);
    if (config.questionsSheetId) {
      updateStatusOnSheet(config.questionsSheetId, questionId, q.status).catch((e) =>
        console.error("Failed to update status on Smartsheet:", e),
      );
    }
  }

  return q;
}

export function closeQuestion(questionId: string): Question | null {
  const questions = loadJsonQuestions();
  const q = questions.find((q) => q.id === questionId);
  if (!q) return null;

  q.status = "closed";
  saveJsonQuestions(questions);

  // Fire-and-forget Smartsheet sync
  const config = getSmartsheetConfig(q.projectId);
  if (config.questionsSheetId) {
    updateStatusOnSheet(config.questionsSheetId, questionId, "closed").catch((e) =>
      console.error("Failed to update status on Smartsheet:", e),
    );
  }

  return q;
}

export function reopenQuestion(questionId: string): Question | null {
  const questions = loadJsonQuestions();
  const q = questions.find((q) => q.id === questionId);
  if (!q) return null;

  q.status = "open";
  saveJsonQuestions(questions);

  // Fire-and-forget Smartsheet sync
  const config = getSmartsheetConfig(q.projectId);
  if (config.questionsSheetId) {
    updateStatusOnSheet(config.questionsSheetId, questionId, "open").catch((e) =>
      console.error("Failed to update status on Smartsheet:", e),
    );
  }

  return q;
}

export function getProjectQuestions(projectId: string): Question[] {
  return loadJsonQuestions()
    .filter((q) => q.projectId === projectId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function getProjectQuestionsAsync(projectId: string): Promise<Question[]> {
  const config = getSmartsheetConfig(projectId);
  if (config.questionsSheetId) {
    try {
      return await readSheetQuestions(config.questionsSheetId, projectId);
    } catch (e) {
      console.error("Failed to read questions from Smartsheet, falling back to JSON:", e);
    }
  }
  return getProjectQuestions(projectId);
}

export function getAllQuestions(): Question[] {
  return loadJsonQuestions()
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function getAllQuestionsAsync(): Promise<Question[]> {
  const { getProjectList } = await import("./smartsheet-data");
  const projects = getProjectList();
  const all: Question[] = [];

  for (const project of projects) {
    const config = getSmartsheetConfig(project.id);
    if (config.questionsSheetId) {
      try {
        const sheetQs = await readSheetQuestions(config.questionsSheetId, project.id);
        all.push(...sheetQs);
        continue;
      } catch (e) {
        console.error(`Failed to read questions for ${project.id} from Smartsheet:`, e);
      }
    }
    // Fall back to JSON for this project
    const jsonQs = loadJsonQuestions().filter((q) => q.projectId === project.id);
    all.push(...jsonQs);
  }

  return all.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function replyToQuestion(questionId: string, reply: string, repliedBy: string): Promise<Question | null> {
  // Use addMessageToQuestion internally for backward compat
  const result = addMessageToQuestion(questionId, {
    text: reply,
    authorName: repliedBy,
    authorEmail: "",
    authorType: "staff",
  });
  if (result) return result;

  // Not in JSON — search Smartsheet across all projects
  const { getProjectList } = await import("./smartsheet-data");
  const projects = getProjectList();
  for (const project of projects) {
    const config = getSmartsheetConfig(project.id);
    if (!config.questionsSheetId) continue;
    try {
      const sheetResult = await replyOnSheet(config.questionsSheetId, questionId, reply, repliedBy);
      if (sheetResult) {
        sheetResult.projectId = project.id;
        return sheetResult;
      }
    } catch (e) {
      console.error(`Failed to reply on Smartsheet for ${project.id}:`, e);
    }
  }

  return null;
}
