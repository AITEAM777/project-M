"use client";
import { createContext, forwardRef, useContext, useId } from "react";
import { cn } from "@/lib/utils";

/** Field provides an id so the first control inside is associated with its label. */
const FieldId = createContext<string | undefined>(undefined);

const base =
  "w-full rounded-lg border border-border bg-surface px-3 text-sm text-text placeholder:text-muted shadow-soft transition-colors focus:border-accent focus:outline-none focus:ring-3 focus:ring-[var(--ring)] disabled:opacity-60";

export const Input = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(function Input({ className, id, ...p }, ref) {
  const fid = useContext(FieldId);
  return <input ref={ref} id={id ?? fid} className={cn(base, "h-9", className)} {...p} />;
});

export const Textarea = forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(function Textarea({ className, id, ...p }, ref) {
  const fid = useContext(FieldId);
  return <textarea ref={ref} id={id ?? fid} className={cn(base, "py-2 min-h-20 resize-y leading-relaxed", className)} {...p} />;
});

export const Select = forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(function Select({ className, children, id, ...p }, ref) {
  const fid = useContext(FieldId);
  return (
    <select ref={ref} id={id ?? fid} className={cn(base, "h-9 pr-8 appearance-none bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2212%22 height=%2212%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%2371717a%22 stroke-width=%222.5%22><path d=%22m6 9 6 6 6-6%22/></svg>')] bg-no-repeat bg-[right_10px_center]", className)} {...p}>
      {children}
    </select>
  );
});

export function Label({ children, className, ...p }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label className={cn("block text-xs font-medium text-muted mb-1.5", className)} {...p}>
      {children}
    </label>
  );
}

export function Field({ label, children, hint, className }: { label: string; children: React.ReactNode; hint?: string; className?: string }) {
  const id = useId();
  return (
    <div className={className}>
      <Label htmlFor={id}>{label}</Label>
      <FieldId.Provider value={id}>{children}</FieldId.Provider>
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </div>
  );
}

export function Checkbox({ checked, onChange, className, label, ...p }: { checked: boolean; onChange: (v: boolean) => void; className?: string; label?: string } & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "onChange">) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      onClick={(e) => { e.stopPropagation(); onChange(!checked); }}
      className={cn(
        "shrink-0 grid place-items-center size-[18px] rounded-[6px] border transition-all",
        checked ? "bg-success border-success text-white scale-100" : "border-border-strong bg-surface hover:border-accent",
        className,
      )}
      {...p}
    >
      {checked && (
        <svg viewBox="0 0 16 16" className="size-3" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3.5 8.5l3 3 6-7" /></svg>
      )}
    </button>
  );
}
