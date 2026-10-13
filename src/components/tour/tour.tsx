"use client";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Lightbulb, X } from "lucide-react";
import { getLocale, tr } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { dispatchTourAction, useTour } from "./tour-store";
import { TOURS, tourFor, type TourStep } from "./tours";

const PAD = 8;
const CARD_W = 360;

type Rect = { top: number; left: number; width: number; height: number };

function findTarget(step: TourStep): HTMLElement | null {
  if (!step.target) return null;
  const els = Array.from(document.querySelectorAll<HTMLElement>(step.target));
  return els.find((el) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0; }) ?? null;
}

/** Spotlight + explanation card for the active tour. */
export function TourOverlay() {
  const { active, step, go, finish } = useTour();
  const tour = TOURS.find((t) => t.id === active) ?? null;
  const current = tour?.steps[step];
  const [rect, setRect] = useState<Rect | null>(null);
  const [ready, setReady] = useState(false);
  const card = useRef<HTMLDivElement>(null);
  const [cardH, setCardH] = useState(200);

  // Locate the step's target (waiting briefly for it to render), then keep it measured.
  useEffect(() => {
    if (!current) return;
    setReady(false);
    if (current.action) dispatchTourAction(current.action);
    let el: HTMLElement | null = null;
    let tries = 0;
    let timer: ReturnType<typeof setTimeout>;
    const measure = () => {
      if (!el) return setRect(null);
      const r = el.getBoundingClientRect();
      setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
    };
    const locate = () => {
      el = findTarget(current);
      if (!el && current.target && tries++ < 15) { timer = setTimeout(locate, 100); return; }
      if (el) {
        const r = el.getBoundingClientRect();
        if (r.top < 0 || r.bottom > window.innerHeight) el.scrollIntoView({ block: "center", behavior: "smooth" });
        setTimeout(measure, r.top < 0 || r.bottom > window.innerHeight ? 350 : 0);
      } else setRect(null);
      setReady(true);
    };
    timer = setTimeout(locate, current.action ? 250 : 30);
    const onMove = () => measure();
    window.addEventListener("resize", onMove);
    window.addEventListener("scroll", onMove, true);
    return () => { clearTimeout(timer); window.removeEventListener("resize", onMove); window.removeEventListener("scroll", onMove, true); };
  }, [current]);

  useLayoutEffect(() => { if (card.current) setCardH(card.current.offsetHeight); }, [current, ready, rect]);

  const next = useCallback(() => { if (!tour) return; if (step < tour.steps.length - 1) go(step + 1); else finish(); }, [tour, step, go, finish]);
  const back = useCallback(() => step > 0 && go(step - 1), [step, go]);

  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.stopPropagation(); finish(); }
      if (e.key === "ArrowRight" || e.key === "Enter") { e.preventDefault(); e.stopPropagation(); next(); }
      if (e.key === "ArrowLeft") { e.preventDefault(); e.stopPropagation(); back(); }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [active, next, back, finish]);

  if (!tour || !current || typeof document === "undefined") return null;
  const lang = getLocale();
  const vw = window.innerWidth, vh = window.innerHeight;
  const w = Math.min(CARD_W, vw - 24);

  // Card placement: preferred side if it fits, otherwise below/above, otherwise centered.
  let pos: { top: number; left: number };
  if (rect && ready) {
    const spot = { top: rect.top - PAD, left: rect.left - PAD, width: rect.width + PAD * 2, height: rect.height + PAD * 2 };
    const fits = {
      bottom: spot.top + spot.height + 12 + cardH < vh,
      top: spot.top - 12 - cardH > 0,
      right: spot.left + spot.width + 12 + w < vw,
      left: spot.left - 12 - w > 0,
    };
    const want = current.placement ?? (fits.bottom ? "bottom" : fits.top ? "top" : fits.right ? "right" : "left");
    const side = fits[want] ? want : (["bottom", "top", "right", "left"] as const).find((s) => fits[s]);
    const cx = Math.min(Math.max(12, spot.left + spot.width / 2 - w / 2), vw - w - 12);
    const cy = Math.min(Math.max(12, spot.top + spot.height / 2 - cardH / 2), vh - cardH - 12);
    if (side === "bottom") pos = { top: spot.top + spot.height + 12, left: cx };
    else if (side === "top") pos = { top: spot.top - 12 - cardH, left: cx };
    else if (side === "right") pos = { top: cy, left: spot.left + spot.width + 12 };
    else if (side === "left") pos = { top: cy, left: spot.left - 12 - w };
    else pos = { top: Math.max(12, vh - cardH - 24), left: vw / 2 - w / 2 }; // target fills the screen
  } else {
    pos = { top: vh / 2 - cardH / 2, left: vw / 2 - w / 2 };
  }

  return createPortal(
    <div className="fixed inset-0 z-[90]" role="dialog" aria-modal="true" aria-label={tr("Guided tour")}>
      {rect && ready ? (
        <div className="pointer-events-none absolute rounded-xl ring-2 ring-accent transition-all duration-300 ease-out"
          style={{ top: rect.top - PAD, left: rect.left - PAD, width: rect.width + PAD * 2, height: rect.height + PAD * 2, boxShadow: "0 0 0 9999px rgba(8,8,16,0.55)" }} />
      ) : (
        <div className="absolute inset-0 bg-[rgba(8,8,16,0.55)] animate-fade-in" />
      )}
      <div ref={card} key={`${tour.id}-${step}`}
        className="absolute rounded-2xl border border-border bg-surface p-5 shadow-pop animate-pop-in"
        style={{ width: w, top: pos.top, left: pos.left, visibility: ready || !current.target ? "visible" : "hidden" }}>
        <div className="mb-2 flex items-start gap-3">
          <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-amber-400/20 text-amber-500"><Lightbulb className="size-4" /></span>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-medium text-muted">{tr("Step {a} of {b}", { a: step + 1, b: tour.steps.length })}</p>
            <h3 className="font-semibold leading-snug">{current.title[lang]}</h3>
          </div>
          <button onClick={finish} className="rounded-md p-1 text-muted hover:bg-surface-2 hover:text-text" aria-label={tr("Close tour")}><X className="size-4" /></button>
        </div>
        <p className="text-sm leading-relaxed text-text-2">{current.body[lang]}</p>
        <div className="mt-4 flex items-center gap-2">
          <div className="flex flex-1 gap-1">
            {tour.steps.map((_, i) => <span key={i} className={cn("h-1.5 rounded-full transition-all", i === step ? "w-4 bg-accent" : "w-1.5 bg-surface-3")} />)}
          </div>
          {step > 0 && <Button size="sm" variant="ghost" onClick={back}>{tr("Back")}</Button>}
          <Button size="sm" variant="primary" onClick={next} autoFocus>{step < tour.steps.length - 1 ? tr("Next") : tr("Got it")}</Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

/** The 💡 button in the bottom-right corner of every page: starts that page's tour. */
export function TourButton() {
  const pathname = usePathname();
  const { seen, loadSeen, start, active } = useTour();
  useEffect(() => loadSeen(), [loadSeen]);
  const tour = tourFor(pathname);
  if (!tour || active) return null;
  const fresh = !seen[tour.id];
  return (
    <button
      data-tour="help"
      onClick={() => start(tour.id)}
      title={tr("How does this page work?")}
      aria-label={tr("How does this page work?")}
      className="group fixed bottom-5 right-5 z-30 grid size-12 place-items-center rounded-full border border-amber-300/60 bg-amber-300 text-amber-950 shadow-pop transition-transform hover:scale-105 active:scale-95 dark:border-amber-300/30 dark:bg-amber-400"
    >
      {fresh && <span className="absolute inset-0 rounded-full bg-amber-300 opacity-60 animate-ping" aria-hidden />}
      <Lightbulb className="relative size-6" strokeWidth={2.2} />
      <span className="pointer-events-none absolute right-full mr-3 whitespace-nowrap rounded-lg bg-[#18181b] px-2.5 py-1.5 text-xs font-medium text-white opacity-0 shadow transition-opacity group-hover:opacity-100 dark:bg-[#ededf0] dark:text-[#18181b]">
        {tr("How does this page work?")}
      </span>
    </button>
  );
}
