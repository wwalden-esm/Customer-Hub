import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";

type Variant = "primary" | "secondary" | "danger" | "ghost" | "accent" | "outline";
type Size = "sm" | "md";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  icon?: ReactNode;
}

const base =
  "inline-flex items-center justify-center font-medium transition-all duration-300 ease-in-out disabled:opacity-50 disabled:pointer-events-none rounded-card hover:shadow-[0_15px_25px_-7px_rgba(0,0,0,0.1)]";

const variants: Record<Variant, string> = {
  primary:
    "bg-esm-red text-white hover:bg-[#DF1111]",
  secondary:
    "bg-white text-esm-grey border border-esm-border hover:bg-slate-50 hover:border-esm-border-hover",
  danger:
    "bg-red-50 text-red-700 border border-red-200 hover:bg-red-100",
  ghost:
    "text-esm-grey hover:text-esm-black hover:bg-slate-50",
  accent:
    "text-white hover:opacity-90",
  outline:
    "bg-white text-esm-red border border-esm-red hover:bg-esm-red hover:text-white",
};

const sizes: Record<Size, string> = {
  sm: "gap-1.5 px-3 py-1.5 text-xs",
  md: "gap-2 px-4 py-2 text-sm",
};

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "secondary", size = "sm", icon, className = "", children, style, ...props }, ref) => {
    const accentStyle =
      variant === "accent"
        ? { backgroundColor: "var(--hub-accent, #F4333F)", ...style }
        : style;

    return (
      <button
        ref={ref}
        className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
        style={accentStyle}
        {...props}
      >
        {icon}
        {children}
      </button>
    );
  },
);

Button.displayName = "Button";
export { Button };
export type { ButtonProps, Variant as ButtonVariant, Size as ButtonSize };
