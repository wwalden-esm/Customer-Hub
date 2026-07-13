interface EsmLogoProps {
  size?: number;
  variant?: "red" | "white" | "black";
  className?: string;
}

const LOGOS: Record<string, { src: string; ratio: number }> = {
  red: { src: "/esm-logo-red.png", ratio: 1375 / 416 },
  white: { src: "/esm-logo-black.png", ratio: 1236 / 333 },
  black: { src: "/esm-logo-black.png", ratio: 1236 / 333 },
};

export function EsmLogo({ size = 48, variant = "red", className }: EsmLogoProps) {
  const logo = LOGOS[variant];
  const w = size;
  const h = Math.round(size / logo.ratio);
  const invert = variant === "white" ? "brightness-0 invert" : "";
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={logo.src}
      alt="ESM Solutions"
      width={w}
      height={h}
      className={`${invert} ${className ?? ""}`.trim()}
    />
  );
}
