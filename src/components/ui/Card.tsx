import type { HTMLAttributes, ReactNode } from "react";

type Accent = "left" | "top" | "none";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  accent?: Accent;
  accentColor?: string;
  padding?: "sm" | "md" | "lg";
  children: ReactNode;
}

const paddings = {
  sm: "p-4",
  md: "p-5",
  lg: "p-6",
};

function Card({
  accent = "none",
  accentColor,
  padding = "md",
  className = "",
  style,
  children,
  ...props
}: CardProps) {
  const accentStyle: React.CSSProperties = {
    ...style,
    ...(accent === "left" && accentColor
      ? { borderLeftWidth: "4px", borderLeftColor: accentColor }
      : {}),
    ...(accent === "top" && accentColor
      ? { borderTopWidth: "3px", borderTopColor: accentColor }
      : {}),
  };

  return (
    <div
      className={`bg-white rounded-card border border-esm-border ${paddings[padding]} ${className}`}
      style={accentStyle}
      {...props}
    >
      {children}
    </div>
  );
}

export { Card };
export type { CardProps };
