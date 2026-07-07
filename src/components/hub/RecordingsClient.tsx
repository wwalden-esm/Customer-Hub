"use client";

import { useState, useMemo } from "react";

interface SharePointFile {
  id: string;
  name: string;
  webUrl: string;
  downloadUrl: string | null;
  mimeType: string;
  size: number;
  lastModified: string | null;
  created: string | null;
}

function fmtDate(d: string | null): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function fmtSize(bytes: number): string {
  if (bytes === 0) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

function fileIcon(mimeType: string): string {
  if (mimeType.startsWith("video/")) return "video";
  if (mimeType.startsWith("audio/")) return "audio";
  if (mimeType.includes("pdf")) return "pdf";
  if (mimeType.includes("presentation") || mimeType.includes("powerpoint")) return "slides";
  return "file";
}

const ICON_COLORS: Record<string, string> = {
  video: "text-purple-600 bg-purple-50",
  audio: "text-blue-600 bg-blue-50",
  pdf: "text-red-600 bg-red-50",
  slides: "text-orange-600 bg-orange-50",
  file: "text-slate-600 bg-slate-50",
};

function FileIconSvg({ type }: { type: string }) {
  if (type === "video") {
    return (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z" />
      </svg>
    );
  }
  if (type === "audio") {
    return (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.114 5.636a9 9 0 0 1 0 12.728M16.463 8.288a5.25 5.25 0 0 1 0 7.424M6.75 8.25l4.72-4.72a.75.75 0 0 1 1.28.53v15.88a.75.75 0 0 1-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.009 9.009 0 0 1 2.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75Z" />
      </svg>
    );
  }
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
    </svg>
  );
}

interface Props {
  files: SharePointFile[];
  configured: boolean;
  sharepointFolderUrl: string | null;
}

export default function RecordingsClient({ files, configured, sharepointFolderUrl }: Props) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!search.trim()) return files;
    const q = search.toLowerCase();
    return files.filter((f) => f.name.toLowerCase().includes(q));
  }, [files, search]);

  if (!configured) {
    return (
      <div className="bg-white rounded-sm border border-[#E2E0E1] px-6 py-10 text-center">
        <div className="w-14 h-14 mx-auto rounded-full bg-slate-100 flex items-center justify-center mb-4">
          <svg className="w-7 h-7 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z" />
          </svg>
        </div>
        <h2 className="text-lg font-semibold text-esm-black mb-2">Recordings Coming Soon</h2>
        <p className="text-sm text-slate-500 max-w-md mx-auto">
          Meeting recordings and related files will be available here once your SharePoint integration is configured.
          Your Solutions Consultant will share recordings after each session.
        </p>
      </div>
    );
  }

  if (files.length === 0) {
    return (
      <div className="bg-white rounded-sm border border-[#E2E0E1] px-6 py-10 text-center">
        <div className="w-14 h-14 mx-auto rounded-full bg-slate-100 flex items-center justify-center mb-4">
          <svg className="w-7 h-7 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z" />
          </svg>
        </div>
        <h2 className="text-lg font-semibold text-esm-black mb-2">No Recordings Yet</h2>
        <p className="text-sm text-slate-500 max-w-md mx-auto">
          Meeting recordings will appear here as they are uploaded to your project folder.
        </p>
        {sharepointFolderUrl && (
          <a
            href={sharepointFolderUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Open recordings folder in SharePoint (opens in new tab)"
            className="inline-flex items-center gap-1.5 mt-4 text-sm font-medium hover:underline"
            style={{ color: "var(--hub-accent)" }}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
            </svg>
            Open in SharePoint
          </a>
        )}
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <div className="relative">
          <svg className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
          </svg>
          <input
            type="text"
            placeholder="Search recordings..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search recordings"
            className="pl-9 pr-3 py-2 text-sm border border-[#E2E0E1] rounded-sm w-full sm:w-72"
          />
        </div>
        {sharepointFolderUrl && (
          <a
            href={sharepointFolderUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Open recordings folder in SharePoint (opens in new tab)"
            className="inline-flex items-center gap-1.5 text-sm font-medium hover:underline"
            style={{ color: "var(--hub-accent)" }}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
            </svg>
            Open in SharePoint
          </a>
        )}
      </div>

      <div className="bg-white rounded-sm border border-[#E2E0E1] divide-y divide-[#E2E0E1]">
        {filtered.length === 0 ? (
          <div className="px-5 py-6 text-center text-sm text-slate-500">
            No recordings match &ldquo;{search}&rdquo;
          </div>
        ) : (
          filtered.map((file) => {
            const icon = fileIcon(file.mimeType);
            return (
              <a
                key={file.id}
                href={file.webUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`${file.name} — ${fmtSize(file.size)}, opens in new tab`}
                className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50 transition-colors"
              >
                <div className={`w-10 h-10 rounded-sm flex items-center justify-center shrink-0 ${ICON_COLORS[icon]}`}>
                  <FileIconSvg type={icon} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-esm-black truncate">{file.name}</p>
                  <div className="flex gap-3 mt-0.5 text-xs text-esm-grey">
                    <span>{fmtDate(file.lastModified)}</span>
                    <span>{fmtSize(file.size)}</span>
                  </div>
                </div>
                <svg className="w-4 h-4 text-[#9E9B9E] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                </svg>
              </a>
            );
          })
        )}
      </div>

      <p className="text-xs text-[#9E9B9E] mt-3">
        {filtered.length} recording{filtered.length !== 1 ? "s" : ""}
        {search && ` matching "${search}"`}
      </p>
    </>
  );
}
