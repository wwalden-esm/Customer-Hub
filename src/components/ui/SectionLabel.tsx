import type { HTMLAttributes } from "react";

interface SectionLabelProps extends HTMLAttributes<HTMLParagraphElement> {
  color?: string;
}

function SectionLabel({ color, className = "", children, ...props }: SectionLabelProps) {
  const colorClass = color ?? "text-esm-grey";
  return (
    <p
      className={`text-label uppercase ${colorClass} ${className}`}
      {...props}
    >
      {children}
    </p>
  );
}

export { SectionLabel };
