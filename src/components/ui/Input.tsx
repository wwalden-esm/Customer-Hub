import { forwardRef, type InputHTMLAttributes, type TextareaHTMLAttributes, type SelectHTMLAttributes, type ReactNode } from "react";

const inputBase =
  "w-full text-sm border border-esm-border rounded-card px-3 py-2 text-esm-black focus:outline-none focus:ring-2 focus:ring-esm-red/30 focus:border-esm-red/50 transition-colors";

const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className = "", ...props }, ref) => (
    <input ref={ref} className={`${inputBase} ${className}`} {...props} />
  ),
);
Input.displayName = "Input";

const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className = "", ...props }, ref) => (
    <textarea ref={ref} className={`${inputBase} resize-y ${className}`} {...props} />
  ),
);
Textarea.displayName = "Textarea";

const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className = "", ...props }, ref) => (
    <select ref={ref} className={`${inputBase} ${className}`} {...props} />
  ),
);
Select.displayName = "Select";

function FormField({ label, htmlFor, children }: { label: string; htmlFor?: string; children: ReactNode }) {
  return (
    <div>
      <label htmlFor={htmlFor} className="block text-xs font-medium text-esm-black mb-1">
        {label}
      </label>
      {children}
    </div>
  );
}

export { Input, Textarea, Select, FormField };
