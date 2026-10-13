"use client";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useLanding } from "./ui";

/** Promo video in a modal. The file lives at /public/promo.mp4. */
export function VideoModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useLanding();
  const [failed, setFailed] = useState(false);
  const closeBtn = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    setFailed(false);
    const prev = document.activeElement as HTMLElement | null;
    closeBtn.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = ""; prev?.focus(); };
  }, [open, onClose]);
  if (!open) return null;
  return createPortal(
    <div className="landing fixed inset-0 z-[100] grid place-items-center bg-transparent p-4" role="dialog" aria-modal="true" aria-label={t.video.title}>
      <div className="absolute inset-0 bg-[rgba(42,44,51,.55)] backdrop-blur-[3px]" onClick={onClose} />
      <div className="relative w-full max-w-[900px] overflow-hidden rounded-[22px] bg-[#1F2026] shadow-2xl">
        <button ref={closeBtn} onClick={onClose} aria-label={t.video.close} className="absolute right-3 top-3 z-10 grid size-9 place-items-center rounded-full bg-white/15 text-white hover:bg-white/25">
          <svg width="14" height="14" viewBox="0 0 14 14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden><path d="M2 2l10 10M12 2 2 12" /></svg>
        </button>
        {failed ? (
          <div className="grid aspect-video place-items-center p-8 text-center text-[16px] text-white/80">{t.video.soon}</div>
        ) : (
          <video className="block aspect-video w-full" src="/promo.mp4" controls autoPlay playsInline onError={() => setFailed(true)}>
            {t.video.soon}
          </video>
        )}
      </div>
    </div>,
    document.body,
  );
}
