interface EsmLogoProps {
  size?: number;
  variant?: "red" | "white" | "black";
  className?: string;
}

const SRC: Record<string, string> = {
  red: "/esm-logo-red.png",
  white: "/esm-logo-black.png",
  black: "/esm-logo-black.png",
};

export function EsmLogo({ size = 48, variant = "red", className }: EsmLogoProps) {
  const w = size;
  const h = Math.round(size / 1.77);
  const invert = variant === "white" ? "brightness-0 invert" : "";
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={SRC[variant]}
      alt="ESM Solutions"
      width={w}
      height={h}
      className={`${invert} ${className ?? ""}`.trim()}
    />
  );
}
