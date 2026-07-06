/**
 * SharePoint integration via Microsoft Graph API.
 * Creates customer folders in a SharePoint document library during provisioning.
 *
 * Required env vars:
 *   SHAREPOINT_TENANT_ID   — Azure AD tenant ID
 *   SHAREPOINT_CLIENT_ID   — App registration client ID
 *   SHAREPOINT_CLIENT_SECRET — App registration client secret
 *   SHAREPOINT_SITE_ID     — SharePoint site ID (format: {hostname},{site-id},{web-id})
 *   SHAREPOINT_DRIVE_ID    — Document library drive ID (optional, defaults to site's default drive)
 *   SHAREPOINT_ROOT_FOLDER — Root folder path within the drive (optional, e.g. "Customer Projects")
 */

const GRAPH_BASE = "https://graph.microsoft.com/v1.0";

let cachedToken: { token: string; expiresAt: number } | null = null;

function getConfig() {
  const tenantId = process.env.SHAREPOINT_TENANT_ID;
  const clientId = process.env.SHAREPOINT_CLIENT_ID;
  const clientSecret = process.env.SHAREPOINT_CLIENT_SECRET;
  const siteId = process.env.SHAREPOINT_SITE_ID;

  if (!tenantId || !clientId || !clientSecret || !siteId) {
    return null;
  }

  return { tenantId, clientId, clientSecret, siteId };
}

export function isSharePointConfigured(): boolean {
  return getConfig() !== null;
}

async function getAccessToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt - 60_000) {
    return cachedToken.token;
  }

  const config = getConfig();
  if (!config) throw new Error("SharePoint not configured");

  const tokenUrl = `https://login.microsoftonline.com/${config.tenantId}/oauth2/v2.0/token`;

  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: config.clientId,
    client_secret: config.clientSecret,
    scope: "https://graph.microsoft.com/.default",
  });

  const res = await fetch(tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`SharePoint token request failed (${res.status}): ${text}`);
  }

  const data = await res.json();
  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };

  return cachedToken.token;
}

async function graphFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = await getAccessToken();
  const res = await fetch(`${GRAPH_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Graph API ${init.method ?? "GET"} ${path} -> ${res.status}: ${text}`);
  }

  return (await res.json()) as T;
}

interface DriveItem {
  id: string;
  name: string;
  webUrl: string;
  folder?: { childCount: number };
  file?: { mimeType: string };
  size?: number;
  lastModifiedDateTime?: string;
  createdDateTime?: string;
  "@microsoft.graph.downloadUrl"?: string;
}

function getDriveBase(): string {
  const config = getConfig()!;
  const driveId = process.env.SHAREPOINT_DRIVE_ID;
  if (driveId) {
    return `/drives/${driveId}`;
  }
  return `/sites/${config.siteId}/drive`;
}

function getRootPath(): string {
  const rootFolder = process.env.SHAREPOINT_ROOT_FOLDER;
  if (rootFolder) {
    return `/root:/${encodeURIComponent(rootFolder)}`;
  }
  return "/root";
}

/**
 * Create a folder in the SharePoint document library.
 * Returns the created folder's ID and web URL.
 */
async function createFolder(parentPath: string, folderName: string): Promise<DriveItem> {
  const driveBase = getDriveBase();

  const result = await graphFetch<DriveItem>(
    `${driveBase}${parentPath}:/children`,
    {
      method: "POST",
      body: JSON.stringify({
        name: folderName,
        folder: {},
        "@microsoft.graph.conflictBehavior": "rename",
      }),
    },
  );

  return result;
}

/**
 * Check if a folder already exists at a given path.
 */
async function folderExists(folderPath: string): Promise<DriveItem | null> {
  const driveBase = getDriveBase();
  try {
    return await graphFetch<DriveItem>(`${driveBase}/root:/${encodeURIComponent(folderPath)}`);
  } catch {
    return null;
  }
}

export interface SharePointFolderResult {
  folderId: string;
  folderUrl: string;
  subfolders: Array<{ name: string; id: string; url: string }>;
}

const DEFAULT_SUBFOLDERS = [
  "Deliverables",
  "Customer Uploads",
  "Meeting Notes",
  "Training Materials",
];

/**
 * Create a customer project folder with standard subfolders.
 * Idempotent: if the folder already exists, returns its info.
 */
export async function createCustomerFolder(
  customerName: string,
  subfolders: string[] = DEFAULT_SUBFOLDERS,
): Promise<SharePointFolderResult> {
  if (!isSharePointConfigured()) {
    throw new Error("SharePoint not configured — set SHAREPOINT_* env vars");
  }

  const rootPath = getRootPath();
  const safeName = customerName.replace(/[<>:"/\\|?*]/g, "_");

  // Create the main customer folder
  const mainFolder = await createFolder(rootPath, safeName);

  // Create subfolders
  const createdSubs: Array<{ name: string; id: string; url: string }> = [];
  for (const sub of subfolders) {
    try {
      const driveBase = getDriveBase();
      const subFolder = await graphFetch<DriveItem>(
        `${driveBase}/items/${mainFolder.id}/children`,
        {
          method: "POST",
          body: JSON.stringify({
            name: sub,
            folder: {},
            "@microsoft.graph.conflictBehavior": "rename",
          }),
        },
      );
      createdSubs.push({ name: sub, id: subFolder.id, url: subFolder.webUrl });
    } catch (e) {
      console.error(`SharePoint: failed to create subfolder "${sub}":`, e);
    }
  }

  return {
    folderId: mainFolder.id,
    folderUrl: mainFolder.webUrl,
    subfolders: createdSubs,
  };
}

/**
 * Get the URL of an existing customer folder.
 */
export async function getCustomerFolderUrl(customerName: string): Promise<string | null> {
  if (!isSharePointConfigured()) return null;

  const rootFolder = process.env.SHAREPOINT_ROOT_FOLDER;
  const safeName = customerName.replace(/[<>:"/\\|?*]/g, "_");
  const path = rootFolder ? `${rootFolder}/${safeName}` : safeName;

  const existing = await folderExists(path);
  return existing?.webUrl ?? null;
}

export interface SharePointFile {
  id: string;
  name: string;
  webUrl: string;
  downloadUrl: string | null;
  mimeType: string;
  size: number;
  lastModified: string | null;
  created: string | null;
}

/**
 * List files in a customer's subfolder (e.g. "Meeting Notes").
 * Returns files sorted by lastModified descending.
 */
export async function listCustomerFolderFiles(
  customerName: string,
  subfolder?: string,
): Promise<SharePointFile[]> {
  if (!isSharePointConfigured()) return [];

  const rootFolder = process.env.SHAREPOINT_ROOT_FOLDER;
  const safeName = customerName.replace(/[<>:"/\\|?*]/g, "_");
  const parts = [rootFolder, safeName, subfolder].filter(Boolean);
  const folderPath = parts.join("/");

  const driveBase = getDriveBase();

  try {
    const result = await graphFetch<{ value: DriveItem[] }>(
      `${driveBase}/root:/${encodeURIComponent(folderPath)}:/children?$orderby=lastModifiedDateTime desc`,
    );

    return result.value
      .filter((item) => item.file)
      .map((item) => ({
        id: item.id,
        name: item.name,
        webUrl: item.webUrl,
        downloadUrl: item["@microsoft.graph.downloadUrl"] ?? null,
        mimeType: item.file!.mimeType,
        size: item.size ?? 0,
        lastModified: item.lastModifiedDateTime ?? null,
        created: item.createdDateTime ?? null,
      }));
  } catch {
    return [];
  }
}
