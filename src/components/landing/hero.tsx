"use client";
import { useEffect, useRef, useState } from "react";
import { H, ThoughtMap, ThoughtMapCompact } from "./thought-map";
import { PlanCard, VideoCard } from "./plan-card";
import { PlayIcon, PrimaryButton, Reveal, SIGNUP, useLanding } from "./ui";

const FRAME_W = 1200;
const BAR = 36;
const FRAME_H = BAR + H; // 640

function BrowserBar() {
  const { t } = useLanding();
  return (
    <div className="flex items-center gap-3 border-b border-[var(--border)] bg-[var(--surface-2)] px-4" style={{ height: BAR }}>
      <span className="flex gap-1.5" aria-hidden>{[0, 1, 2].map((i) => <span key={i} className="size-[9px] rounded-full bg-[#E2DDD3]" />)}</span>
      <span className="text-[12px] text-[var(--text-soft)]">{t.map.url}</span>
    </div>
  );
}

/** The product mockup: a fixed 1200×640 window scaled down to fit narrower screens. */
function AppMockup() {
  const { t } = useLanding();
  const wrap = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setScale(Math.min(1, e.contentRect.width / FRAME_W)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return (
    <>
      <div ref={wrap} className="hidden md:block" style={{ height: FRAME_H * scale }}>
        <div role="img" aria-label={t.map.label} className="l-shadow origin-top-left overflow-hidden rounded-[22px] border border-[var(--border)] bg-white" style={{ width: FRAME_W, height: FRAME_H, transform: `scale(${scale})` }}>
          <BrowserBar />
          <div className="flex" style={{ height: H }}>
            <div className="relative w-[880px] shrink-0"><ThoughtMap /></div>
            <aside className="flex flex-1 flex-col justify-between border-l border-[var(--border)] bg-[var(--surface-2)] p-4">
              <PlanCard />
              <VideoCard />
            </aside>
          </div>
        </div>
      </div>
      <div className="l-shadow overflow-hidden rounded-[22px] border border-[var(--border)] bg-white md:hidden">
        <BrowserBar />
        <ThoughtMapCompact />
        <div className="space-y-3 border-t border-[var(--border)] bg-[var(--surface-2)] p-4"><PlanCard /><VideoCard /></div>
      </div>
    </>
  );
}

export function Hero() {
  const { t, openVideo, signedIn } = useLanding();
  return (
    <section id="top" className="relative -mt-[68px] pt-[68px]" style={{ background: "linear-gradient(180deg, #F1EEF7 0%, #F4F2F3 38%, var(--bg) 70%)" }}>
      <div className="l-container pt-14 text-center md:pt-20">
        <Reveal>
          <p className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-white/80 py-1 pl-1 pr-3.5 text-[13px] text-[var(--text-muted)] shadow-[0_1px_2px_rgba(42,44,51,.04)]">
            <span className="rounded-full bg-[#E7F1EC] px-2.5 py-0.5 text-[12px] font-semibold text-[#3E7C63]">{t.hero.badgeNew}</span>
            {t.hero.badge}
          </p>
        </Reveal>
        <Reveal delay={60}>
          <h1 className="l-h1 mx-auto mt-7 max-w-[1100px]">{t.hero.titleA.split("\n").map((part, i) => <span key={i}>{i > 0 && <><br className="max-sm:hidden" />{" "}</>}{part}</span>)}<span className="l-grad">{t.hero.titleHi}</span>{t.hero.titleB}</h1>
        </Reveal>
        <Reveal delay={120}>
          <p className="mx-auto mt-6 max-w-[640px] text-[18px] leading-relaxed text-[var(--text-muted)] md:text-[20px]">{t.hero.lead}</p>
        </Reveal>
        <Reveal delay={180} className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <PrimaryButton href={signedIn ? "/dashboard" : SIGNUP}>{signedIn ? t.nav.open : t.hero.cta}</PrimaryButton>
          <button onClick={openVideo} className="l-btn l-btn-secondary">
            <span className="grid size-7 place-items-center rounded-full border border-[var(--border)] text-[var(--text)]"><PlayIcon /></span>
            {t.hero.video} · 0:20
          </button>
        </Reveal>
        <Reveal delay={220}><p className="mt-5 text-[13.5px] text-[var(--text-soft)]">{t.hero.note}</p></Reveal>
      </div>
      <Reveal className="l-container mt-14 md:mt-16"><AppMockup /></Reveal>
    </section>
  );
}
