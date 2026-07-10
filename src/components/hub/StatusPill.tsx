import { Badge, type BadgeVariant } from "@/components/ui";

type Status = "ON_TRACK" | "AT_RISK" | "OFF_TRACK";

const META: Record<Status, { label: string; variant: BadgeVariant; dotClass: string }> = {
  ON_TRACK: {
    label: "On Track",
    variant: "neutral",
    dotClass: "bg-esm-black",
  },
  AT_RISK: {
    label: "At Risk",
    variant: "danger",
    dotClass: "bg-amber-500",
  },
  OFF_TRACK: {
    label: "Off Track",
    variant: "danger",
    dotClass: "bg-esm-red",
  },
};

export default function StatusPill({ status }: { status: Status }) {
  const m = META[status];
  return (
    <Badge
      variant={m.variant}
      className="gap-1.5 text-[11px] font-bold tracking-wider uppercase px-2.5"
      role="status"
    >
      <span className={`w-[5px] h-[5px] rounded-full shrink-0 ${m.dotClass}`} aria-hidden="true" />
      {m.label}
    </Badge>
  );
}
