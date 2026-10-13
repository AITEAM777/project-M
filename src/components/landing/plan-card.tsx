"use client";
import { PlayIcon, useLanding } from "./ui";

const ITEMS: { color: string; done: boolean }[] = [
  { color: "#B5873A", done: true },
  { color: "#4F9277", done: true },
  { color: "#BF6E4E", done: false },
  { color: "#B5873A", done: false },
  { color: "#7C70BF", done: false },
];

/** "Week plan" card: tasks that came out of the mind map, with a progress bar in sphere colors. */
export function PlanCard() {
  const { t } = useLanding();
  const done = ITEMS.filter((i) => i.done).length;
  const pct = Math.round((done / ITEMS.length) * 100);
  return (
    <div className="rounded-[16px] border border-[var(--border)] bg-white p-4 shadow-[0_1px_2px_rgba(42,44,51,.04),0_10px_30px_-18px_rgba(42,44,51,.2)]">
      <p className="l-head text-[15px] tracking-[-0.3px]">{t.plan.title}</p>
      <p className="mt-0.5 text-[12px] text-[var(--text-soft)]">{t.plan.sub}</p>
      <ul className="mt-3">
        {ITEMS.map((it, i) => (
          <li key={i} className="flex items-center gap-2.5 border-t border-[#F0EDE6] py-[9px] first:border-t-0">
            <span className={`grid size-[17px] shrink-0 place-items-center rounded-[5px] border ${it.done ? "border-[#4F9277] bg-[#4F9277]" : "border-[#D6D1C7] bg-white"}`} aria-hidden>
              {it.done && <svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M3.5 8.5l3 3 6-7" /></svg>}
            </span>
            <span className={`flex-1 text-[13px] ${it.done ? "text-[var(--text-soft)] line-through decoration-[#B9B4AA]" : "text-[var(--text)]"}`}>
              <span className="sr-only">{it.done ? "✓ " : ""}</span>{t.plan.items[i]}
            </span>
            <span className="size-[7px] shrink-0 rounded-full" style={{ background: it.color }} aria-hidden />
          </li>
        ))}
      </ul>
      <div className="mt-3 flex items-center justify-between text-[12px]">
        <span className="text-[var(--text-muted)]">{t.plan.progress}</span>
        <span className="font-semibold">{pct}%</span>
      </div>
      <div className="mt-1.5 flex gap-1" role="img" aria-label={`${t.plan.progress}: ${pct}%`}>
        {ITEMS.map((it, i) => <span key={i} className="h-[6px] flex-1 rounded-full" style={{ background: it.color, opacity: it.done ? 1 : 0.22 }} />)}
      </div>
    </div>
  );
}

export function VideoCard() {
  const { t, openVideo } = useLanding();
  return (
    <button onClick={openVideo} className="group flex w-full items-center gap-3 rounded-[16px] border border-[var(--border)] bg-white p-3 text-left transition-shadow hover:shadow-[0_8px_24px_-14px_rgba(42,44,51,.35)]">
      <span className="grid size-10 shrink-0 place-items-center rounded-full bg-[var(--brand)] text-white transition-transform group-hover:scale-105"><PlayIcon /></span>
      <span>
        <span className="block text-[13px] font-semibold">{t.plan.howTitle}</span>
        <span className="block text-[12px] text-[var(--text-soft)]">{t.plan.howSub} · 0:20</span>
      </span>
    </button>
  );
}
