"use client";
import { tr } from "@/lib/i18n";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CheckCircle2, Info, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToasts } from "@/lib/client/store";

export function Badge({ children, className, color }: { children: React.ReactNode; className?: string; color?: string }) {
  return (
    <span
      className={cn("inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium bg-surface-2 text-text-2 border border-border whitespace-nowrap", className)}
      style={color ? { background: `${color}1a`, color, borderColor: `${color}33` } : undefined}
    >
      {children}
    </span>
  );
}

export function Progress({ value, className, color, size = "md" }: { value: number; className?: string; color?: string; size?: "sm" | "md" }) {
  const v = Math.max(0, Math.min(100, value));
  return (
    <div className={cn("w-full rounded-full bg-surface-3 overflow-hidden", size === "sm" ? "h-1.5" : "h-2", className)} role="progressbar" aria-valuenow={v} aria-valuemin={0} aria-valuemax={100}>
      <div className="h-full rounded-full transition-[width] duration-500 ease-out" style={{ width: `${v}%`, background: color ?? (v >= 100 ? "var(--success)" : "var(--accent)") }} />
    </div>
  );
}

export function ProgressRing({ value, size = 44, stroke = 4, color }: { value: number; size?: number; stroke?: number; color?: string }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(100, value));
  return (
    <svg width={size} height={size} className="-rotate-90 shrink-0" aria-label={`${v}%`}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--surface-3)" strokeWidth={stroke} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color ?? (v >= 100 ? "var(--success)" : "var(--accent)")} strokeWidth={stroke} strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c - (v / 100) * c} className="transition-[stroke-dashoffset] duration-700 ease-out" />
      <text x="50%" y="50%" dominantBaseline="central" textAnchor="middle" className="rotate-90 origin-center fill-[var(--text)] text-[11px] font-semibold tabular">{v}%</text>
    </svg>
  );
}

export function Spinner({ className }: { className?: string }) {
  return <div className={cn("size-5 rounded-full border-2 border-border-strong border-t-accent animate-spin", className)} />;
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-lg bg-surface-3/70", className)} />;
}

export function PageSkeleton() {
  return (
    <div className="space-y-4 p-1">
      <Skeleton className="h-8 w-56" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-32" />)}
      </div>
    </div>
  );
}

/** `guide`: a "how this section works" link to the tutorial, e.g. { href: guideHref("goals"), label: "…" }. */
export function EmptyState({ icon, title, body, action, guide, className }: { icon?: React.ReactNode; title: string; body?: string; action?: React.ReactNode; guide?: { href: string; label: string }; className?: string }) {
  return (
    <div className={cn("flex flex-col items-center justify-center text-center py-14 px-6 rounded-2xl border border-dashed border-border bg-surface/40", className)}>
      {icon && <div className="mb-3 grid place-items-center size-12 rounded-2xl bg-accent-soft text-accent">{icon}</div>}
      <h3 className="font-semibold">{title}</h3>
      {body && <p className="mt-1 max-w-sm text-sm text-muted">{body}</p>}
      {action && <div className="mt-4">{action}</div>}
      {guide && <a href={guide.href} className="mt-3 text-[13px] font-medium text-accent hover:underline">📖 {guide.label} →</a>}
    </div>
  );
}

export function Card({ children, className, ...p }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("rounded-2xl border border-border bg-surface shadow-soft", className)} {...p}>{children}</div>;
}

export function Kbd({ children }: { children: React.ReactNode }) {
  return <kbd className="inline-flex items-center rounded border border-border bg-surface-2 px-1 font-mono text-[10px] text-muted">{children}</kbd>;
}

export function Tabs<T extends string>({ value, onChange, items, className, "data-tour": tour }: { value: T; onChange: (v: T) => void; items: { value: T; label: React.ReactNode }[]; className?: string; "data-tour"?: string }) {
  return (
    <div role="tablist" data-tour={tour} className={cn("inline-flex p-0.5 rounded-lg bg-surface-2 border border-border", className)}>
      {items.map((i) => (
        <button
          key={i.value}
          role="tab"
          aria-selected={value === i.value}
          onClick={() => onChange(i.value)}
          className={cn("px-2.5 h-7 rounded-md text-[13px] font-medium transition-colors whitespace-nowrap", value === i.value ? "bg-surface text-text shadow-soft" : "text-muted hover:text-text")}
        >
          {i.label}
        </button>
      ))}
    </div>
  );
}

/** Lightweight dropdown/popover anchored to a trigger, rendered in a portal. */
export function Popover({ trigger, children, align = "start", className, open: openProp, onOpenChange }: {
  trigger: (p: { open: boolean; toggle: () => void }) => React.ReactNode;
  children: React.ReactNode | ((close: () => void) => React.ReactNode);
  align?: "start" | "end";
  className?: string;
  open?: boolean;
  onOpenChange?: (v: boolean) => void;
}) {
  const [inner, setInner] = useState(false);
  const open = openProp ?? inner;
  const setOpen = (v: boolean) => { setInner(v); onOpenChange?.(v); };
  const anchor = useRef<HTMLSpanElement>(null);
  const pop = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number; right: number } | null>(null);
  useEffect(() => {
    if (!open) return;
    const place = () => {
      const r = anchor.current?.getBoundingClientRect();
      if (r) setPos({ top: r.bottom + 6, left: r.left, right: window.innerWidth - r.right });
    };
    place();
    const onDown = (e: MouseEvent) => {
      if (!pop.current?.contains(e.target as Node) && !anchor.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);
  const close = () => setOpen(false);
  return (
    <>
      <span ref={anchor} className="inline-flex">{trigger({ open, toggle: () => setOpen(!open) })}</span>
      {open && pos && typeof document !== "undefined" &&
        createPortal(
          <div
            ref={pop}
            className={cn("fixed z-[60] min-w-48 max-h-[70vh] overflow-auto rounded-xl border border-border bg-surface p-1 shadow-pop animate-pop-in", className)}
            style={{ top: Math.min(pos.top, window.innerHeight - 80), ...(align === "end" ? { right: Math.max(8, pos.right) } : { left: Math.min(pos.left, window.innerWidth - 220) }) }}
          >
            {typeof children === "function" ? children(close) : children}
          </div>,
          document.body,
        )}
    </>
  );
}

export function MenuItem({ icon, children, onClick, danger, shortcut, active, disabled }: { icon?: React.ReactNode; children: React.ReactNode; onClick?: () => void; danger?: boolean; shortcut?: string; active?: boolean; disabled?: boolean }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-2.5 px-2.5 h-8 rounded-lg text-[13px] text-left transition-colors disabled:opacity-40",
        danger ? "text-danger hover:bg-danger-soft" : "text-text-2 hover:bg-surface-2 hover:text-text",
        active && "bg-surface-2 text-text",
      )}
    >
      {icon && <span className="size-4 grid place-items-center opacity-80 [&>svg]:size-4">{icon}</span>}
      <span className="flex-1 truncate">{children}</span>
      {shortcut && <span className="text-[11px] text-muted">{shortcut}</span>}
    </button>
  );
}

export function MenuSeparator() {
  return <div className="my-1 h-px bg-border" />;
}

export function Toaster() {
  const { toasts, dismiss } = useToasts();
  return (
    <div className="fixed bottom-20 right-4 z-[70] flex flex-col gap-2 w-[min(380px,calc(100vw-2rem))]" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className="flex items-start gap-2.5 rounded-xl border border-border bg-surface p-3 shadow-pop animate-slide-in text-sm">
          {t.kind === "success" ? <CheckCircle2 className="size-4 mt-0.5 text-success shrink-0" /> : t.kind === "error" ? <XCircle className="size-4 mt-0.5 text-danger shrink-0" /> : <Info className="size-4 mt-0.5 text-accent shrink-0" />}
          <p className="flex-1 leading-snug">{t.message}</p>
          {t.action && (
            <button className="font-medium text-accent hover:underline" onClick={() => { t.action!.run(); dismiss(t.id); }}>
              {t.action.label}
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

export function Tooltip({ label, children, side = "top" }: { label: string; children: React.ReactNode; side?: "top" | "bottom" | "right" }) {
  const pos = { top: "bottom-full mb-1.5 left-1/2 -translate-x-1/2", bottom: "top-full mt-1.5 left-1/2 -translate-x-1/2", right: "left-full ml-2 top-1/2 -translate-y-1/2" }[side];
  return (
    <span className="relative inline-flex group/tt">
      {children}
      <span role="tooltip" className={cn("pointer-events-none absolute z-50 whitespace-nowrap rounded-md bg-[#18181b] px-2 py-1 text-[11px] font-medium text-white opacity-0 transition-opacity delay-300 group-hover/tt:opacity-100 dark:bg-[#ededf0] dark:text-[#18181b]", pos)}>
        {label}
      </span>
    </span>
  );
}

export function TagInput({ value, onChange, placeholder = "Add tag…" }: { value: string[]; onChange: (v: string[]) => void; placeholder?: string }) {
  const [draft, setDraft] = useState("");
  const add = () => {
    const t = draft.trim().toLowerCase().replace(/^#/, "").slice(0, 40);
    if (t && !value.includes(t)) onChange([...value, t]);
    setDraft("");
  };
  return (
    <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-border bg-surface px-2 py-1.5 min-h-9 focus-within:border-accent">
      {value.map((t) => (
        <span key={t} className="inline-flex items-center gap-1 rounded-md bg-accent-soft text-accent px-1.5 py-0.5 text-xs font-medium">
          #{t}
          <button aria-label={tr("Remove {tag}", { tag: t })} onClick={() => onChange(value.filter((x) => x !== t))} className="opacity-60 hover:opacity-100">×</button>
        </span>
      ))}
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === ",") { e.preventDefault(); add(); }
          if (e.key === "Backspace" && !draft && value.length) onChange(value.slice(0, -1));
        }}
        onBlur={add}
        placeholder={value.length ? "" : tr(placeholder)}
        className="flex-1 min-w-20 bg-transparent text-sm outline-none placeholder:text-muted"
      />
    </div>
  );
}

export const COLORS = ["#6366f1", "#8b5cf6", "#ec4899", "#ef4444", "#f97316", "#f59e0b", "#10b981", "#14b8a6", "#0ea5e9", "#3b82f6", "#64748b"];

export function ColorPicker({ value, onChange, allowNone }: { value: string; onChange: (c: string) => void; allowNone?: boolean }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {allowNone && (
        <button aria-label={tr("Default color")} onClick={() => onChange("")} className={cn("size-6 rounded-full border-2 border-dashed border-border-strong", !value && "ring-2 ring-offset-2 ring-offset-surface ring-accent")} />
      )}
      {COLORS.map((c) => (
        <button key={c} aria-label={c} onClick={() => onChange(c)} className={cn("size-6 rounded-full transition-transform hover:scale-110", value === c && "ring-2 ring-offset-2 ring-offset-surface ring-[var(--accent)]")} style={{ background: c }} />
      ))}
    </div>
  );
}
