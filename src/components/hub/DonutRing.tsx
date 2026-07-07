interface DonutRingProps {
  percent: number;
  color: string;
  size?: number;
  label?: string;
}

export default function DonutRing({ percent, color, size = 52, label }: DonutRingProps) {
  const r = (size - 8) / 2;
  const circ = 2 * Math.PI * r;
  const dash = (percent / 100) * circ;

  return (
    <svg
      width={size}
      height={size}
      className="-rotate-90"
      role="img"
      aria-label={label || `${Math.round(percent)}% complete`}
    >
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="#E2E0E1"
        strokeWidth="6"
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth="6"
        strokeDasharray={`${dash} ${circ - dash}`}
        strokeLinecap="round"
      />
    </svg>
  );
}
