"use client";

import type { ReceivingProcessData } from "@/types";
import { FieldList, SectionIntro, type FieldDef } from "../primitives";

const FIELDS: ReadonlyArray<FieldDef<ReceivingProcessData>> = [
  { key: "receivingModel", label: "Centralized receiving, distributed, or both?", required: true, type: "select", options: ["Centralized", "Distributed", "Both"] },
  { key: "centralReceivingAddress", label: "Central Receiving address (if applicable)", type: "textarea" },
  { key: "whoPerforms", label: "Who performs receiving?", required: true, hint: "Central staff, requestor, designated receivers" },
  { key: "quantityValueOrBoth", label: "Quantity-based, value-based, or both?", required: true, type: "select", options: ["Quantity-based", "Value-based", "Both"] },
  { key: "partialReceiptsAllowed", label: "Partial receipts allowed?", required: true },
  { key: "overReceiptsAllowed", label: "Over-receipts allowed? Tolerance?", required: true },
  { key: "serviceReceivingModel", label: "Service receiving model", required: true, hint: "Milestone, value, time-based" },
];

interface Props {
  data: Record<string, unknown>;
  onChange: (d: Record<string, unknown>) => void;
}

export function ReceivingProcessSection({ data, onChange }: Props) {
  return (
    <div>
      <SectionIntro>How your team handles receiving today.</SectionIntro>
      <FieldList<ReceivingProcessData>
        data={data as ReceivingProcessData}
        fields={FIELDS}
        onChange={(d) => onChange(d as unknown as Record<string, unknown>)}
      />
    </div>
  );
}
