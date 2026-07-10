interface SectionLabelProps {
  id?: string;
  color?: string;
  className?: string;
  children: React.ReactNode;
}

function SectionLabel({ id, color, className, children }: SectionLabelProps) {
  const colorClass = color ?? "text-esm-grey";
  return (
    <span
      id={id}
      className={`text-label font-extrabold tracking-[0.09em] uppercase ${colorClass} ${className ?? ""}`.trim()}
    >
      {children}
    </span>
  );
}

export { SectionLabel };
