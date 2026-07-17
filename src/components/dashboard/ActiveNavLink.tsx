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
      aria-current={isActive ? "page" : undefined}
      className={`text-sm px-2.5 py-1.5 rounded-card transition-colors ${
        isActive
          ? "text-white font-medium bg-white/20"
          : "text-white/75 hover:text-white hover:bg-white/10"
      }`}
    >
      {children}
    </a>
  );
}
