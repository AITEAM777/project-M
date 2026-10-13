"use client";
import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useConfirmStore } from "@/lib/client/store";
import { Button } from "./button";

export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = "md",
  className,
}: {
  open: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  description?: React.ReactNode;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.stopPropagation(); closeRef.current(); }
      if (e.key === "Tab" && ref.current) {
        // Focus trap
        const f = ref.current.querySelectorAll<HTMLElement>('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
        if (!f.length) return;
        const first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener("keydown", onKey, true);
    setTimeout(() => {
      const el = ref.current?.querySelector<HTMLElement>("[autofocus], input, textarea, select");
      (el ?? ref.current)?.focus();
    }, 10);
    return () => { document.removeEventListener("keydown", onKey, true); prev?.focus?.(); };
  }, [open]);
  if (!open || typeof document === "undefined") return null;
  const w = { sm: "max-w-sm", md: "max-w-lg", lg: "max-w-2xl", xl: "max-w-4xl" }[size];
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] animate-fade-in" onClick={onClose} />
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        tabIndex={-1}
        className={cn("relative w-full bg-surface border border-border shadow-pop rounded-t-2xl sm:rounded-2xl animate-pop-in max-h-[92vh] flex flex-col outline-none", w, className)}
      >
        {(title || description) && (
          <div className="px-5 pt-5 pb-3 pr-12">
            {title && <h2 className="text-[17px] font-semibold tracking-tight">{title}</h2>}
            {description && <p className="mt-1 text-sm text-muted">{description}</p>}
          </div>
        )}
        <button onClick={onClose} aria-label="Close" className="absolute right-3 top-3 p-1.5 rounded-lg text-muted hover:bg-surface-2 hover:text-text">
          <X className="size-4" />
        </button>
        <div className="px-5 pb-5 overflow-y-auto">{children}</div>
        {footer && <div className="px-5 py-3.5 border-t border-border flex justify-end gap-2 bg-surface-2/50 rounded-b-2xl">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}

export function ConfirmHost() {
  const { req, close } = useConfirmStore();
  const done = (ok: boolean) => { req?.resolve(ok); close(); };
  return (
    <Dialog
      open={!!req}
      onClose={() => done(false)}
      size="sm"
      title={req?.title}
      description={req?.body}
      footer={
        <>
          <Button variant="ghost" onClick={() => done(false)}>Cancel</Button>
          <Button variant={req?.danger ? "danger" : "primary"} onClick={() => done(true)} autoFocus>
            {req?.confirmLabel ?? "Confirm"}
          </Button>
        </>
      }
    />
  );
}
