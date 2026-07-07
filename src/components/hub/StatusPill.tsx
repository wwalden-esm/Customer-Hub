type Status = "ON_TRACK" | "AT_RISK" | "OFF_TRACK";

const META: Record<Status, { label: string; className: string; dotClass: string }> = {
  ON_TRACK: {
    label: "On Track",
    className: "bg-gray-50 text-esm-black border-esm-black/25",
    dotClass: "bg-esm-black",
  },
  AT_RISK: {
    label: "At Risk",
    className: "bg-red-50 text-esm-black border-esm-black/25",
    dotClass: "bg-amber-500",
  },
  OFF_TRACK: {
    label: "Off Track",
    className: "bg-red-50 text-esm-red border-esm-red/25",
    dotClass: "bg-esm-red",
  },
};

export default function StatusPill({ status }: { status: Status }) {
  const m = META[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-[11px] font-bold tracking-wider uppercase px-2.5 py-0.5 rounded-sm border ${m.className}`}
      role="status"
    >
      <span className={`w-[5px] h-[5px] rounded-full shrink-0 ${m.dotClass}`} aria-hidden="true" />
      {m.label}
    </span>
  );
}
