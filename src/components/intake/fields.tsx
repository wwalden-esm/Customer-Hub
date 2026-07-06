"use client";

import type { ReactNode } from "react";

interface FieldProps {
  label: string;
  required?: boolean;
  hint?: string;
  warning?: string;
  children: ReactNode;
}

export function Field({ label, required, hint, warning, children }: FieldProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700">
        {label}
        {required && <span className="text-red-600 ml-1">*</span>}
      </label>
      <div className="mt-1">{children}</div>
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
      {warning && <p className="mt-1 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded p-2">{warning}</p>}
    </div>
  );
}

export const inputClass =
  "w-full rounded border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-esm-red/40";

export const textareaClass = `${inputClass} min-h-24`;
export const selectClass = inputClass;

export function SectionDescription({ children }: { children: ReactNode }) {
  return <p className="text-sm text-slate-600 mb-4">{children}</p>;
}

interface ToggleProps {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}

export function Toggle({ label, checked, onChange, disabled }: ToggleProps) {
  return (
    <label className="inline-flex items-center gap-2 cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className="rounded border-slate-300"
      />
      <span className="text-sm text-slate-700">{label}</span>
    </label>
  );
}

interface MultiCheckboxProps<T extends string> {
  options: readonly T[];
  selected: T[];
  onChange: (v: T[]) => void;
}

export function MultiCheckbox<T extends string>({ options, selected, onChange }: MultiCheckboxProps<T>) {
  const toggle = (opt: T) => {
    if (selected.includes(opt)) onChange(selected.filter((s) => s !== opt));
    else onChange([...selected, opt]);
  };
  return (
    <div className="flex flex-wrap gap-3">
      {options.map((opt) => (
        <label key={opt} className="inline-flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={selected.includes(opt)}
            onChange={() => toggle(opt)}
            className="rounded border-slate-300"
          />
          <span className="text-sm text-slate-700">{opt}</span>
        </label>
      ))}
    </div>
  );
}
