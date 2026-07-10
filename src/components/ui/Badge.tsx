import type { HTMLAttributes } from "react";

type BadgeVariant =
  | "neutral"
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "accent";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  pill?: boolean;
}

const variants: Record<BadgeVariant, string> = {
  neutral: "bg-gray-100 text-esm-grey border-esm-border",
  success: "bg-green-50 text-green-700 border-green-200",
  warning: "bg-amber-50 text-amber-700 border-amber-200",
  danger: "bg-red-50 text-red-700 border-red-200",
  info: "bg-blue-50 text-blue-700 border-blue-200",
  accent: "bg-hub-accent-light text-esm-red border-hub-accent-border",
};

function Badge({
  variant = "neutral",
  pill = false,
  className = "",
  children,
  ...props
}: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1 text-badge px-2 py-0.5 border ${
        pill ? "rounded-full" : "rounded-card"
      } ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </span>
  );
}

export { Badge };
export type { BadgeProps, BadgeVariant };
