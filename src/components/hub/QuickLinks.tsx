import type { HubLink } from "@/types/hub";

const ICON_PATHS: Record<string, string> = {
  smartsheet: "M3 3h18v18H3V3zm2 2v14h14V5H5zm2 3h10v2H7V8zm0 4h10v2H7v-2z",
  sharepoint: "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z",
  document: "M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zm-1 2l5 5h-5V4zM8 13h8v2H8v-2zm0 4h8v2H8v-2zm0-8h3v2H8V9z",
  video: "M17 10.5V7a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h12a1 1 0 001-1v-3.5l4 4v-11l-4 4z",
  calendar: "M19 3h-1V1h-2v2H8V1H6v2H5c-1.1 0-2 .9-2 2v14a2 2 0 002 2h14a2 2 0 002-2V5a2 2 0 00-2-2zm0 16H5V8h14v11zM7 10h5v5H7v-5z",
  training: "M5 13.18v4L12 21l7-3.82v-4L12 17l-7-3.82zM12 3L1 9l11 6 9-4.91V17h2V9L12 3z",
  link: "M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14",
};

function LinkIcon({ icon }: { icon?: string }) {
  const d = icon && ICON_PATHS[icon] ? ICON_PATHS[icon] : ICON_PATHS.link;
  const isStroke = !icon || icon === "link";

  return (
    <svg className="w-4 h-4 shrink-0 opacity-60" viewBox="0 0 24 24" fill={isStroke ? "none" : "currentColor"} stroke={isStroke ? "currentColor" : "none"} strokeWidth={isStroke ? 2 : 0} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={d} />
    </svg>
  );
}

export default function QuickLinks({ links }: { links: HubLink[] }) {
  if (links.length === 0) return null;

  return (
    <section className="bg-white border border-esm-border rounded-card p-5" aria-labelledby="quick-links-heading">
      <h2 id="quick-links-heading" className="text-[10px] font-extrabold text-esm-grey tracking-[0.09em] uppercase mb-3">
        Quick Links
      </h2>
      <ul className="space-y-1.5">
        {links.map((link, i) => (
          <li key={i}>
            <a
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2.5 px-3 py-2 rounded text-sm text-esm-black hover:bg-slate-50 transition-colors group"
            >
              <LinkIcon icon={link.icon} />
              <span className="group-hover:underline">{link.label}</span>
              <svg className="w-3 h-3 ml-auto opacity-0 group-hover:opacity-40 transition-opacity shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
