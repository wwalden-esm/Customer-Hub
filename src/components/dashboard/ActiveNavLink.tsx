"use client";

import { usePathname } from "next/navigation";

export default function ActiveNavLink({
  href,
  exact,
  children,
}: {
  href: string;
  exact?: boolean;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isActive = exact ? pathname === href : pathname.startsWith(href);

  return (
    <a
      href={href}
      className={`text-sm px-2.5 py-1.5 rounded-card transition-colors ${
        isActive
          ? "text-esm-black font-medium bg-slate-100"
          : "text-esm-grey hover:text-esm-black hover:bg-slate-50"
      }`}
    >
      {children}
    </a>
  );
}
