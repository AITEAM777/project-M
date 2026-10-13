"use client";
import { Reveal, useLanding } from "./ui";

const ICONS = [
  // scattered thoughts
  <svg key="0" width="72" height="40" viewBox="0 0 72 40" aria-hidden><circle cx="8" cy="22" r="3.2" fill="#2A2C33" /><circle cx="27" cy="11" r="3.2" fill="#2A2C33" /><circle cx="40" cy="29" r="3.2" fill="#2A2C33" /><circle cx="58" cy="17" r="3.2" fill="#2A2C33" opacity=".35" /></svg>,
  // connected
  <svg key="1" width="72" height="40" viewBox="0 0 72 40" aria-hidden><path d="M8 26 27 13 44 25 62 12" fill="none" stroke="#5F56B0" strokeWidth="1.6" /><circle cx="8" cy="26" r="3.4" fill="#2A2C33" /><circle cx="27" cy="13" r="3.4" fill="#2A2C33" /><circle cx="44" cy="25" r="3.4" fill="#2A2C33" /><circle cx="62" cy="12" r="3.4" fill="#2A2C33" /></svg>,
  // checklist
  <svg key="2" width="72" height="40" viewBox="0 0 72 40" aria-hidden><rect x="4" y="7" width="11" height="11" rx="3" fill="#2A2C33" /><path d="m6.8 12.6 2.2 2.2 3.8-4.4" fill="none" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" /><rect x="21" y="10.5" width="30" height="4" rx="2" fill="#2A2C33" /><rect x="4.7" y="23.7" width="9.6" height="9.6" rx="2.6" fill="none" stroke="#2A2C33" strokeWidth="1.4" /><rect x="21" y="26.5" width="22" height="4" rx="2" fill="#D6D0C4" /></svg>,
  // growth
  <svg key="3" width="72" height="40" viewBox="0 0 72 40" aria-hidden><path d="M4 34 20 26 32 29 48 15 66 6" fill="none" stroke="#5F56B0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /><circle cx="66" cy="6" r="3.2" fill="#5F56B0" /></svg>,
];

export function Steps() {
  const { t } = useLanding();
  return (
    <section id="how" className="l-section scroll-mt-20" aria-labelledby="steps-title">
      <div className="l-container">
        <Reveal>
          <p className="l-kicker">{t.steps.kicker}</p>
          <h2 id="steps-title" className="l-h2 mt-4">{t.steps.titleA}<span className="l-grad">{t.steps.titleHi}</span>{t.steps.titleB}</h2>
        </Reveal>
        <ol className="mt-14 grid gap-10 border-t border-[var(--border)] pt-10 sm:grid-cols-2 lg:grid-cols-4 lg:gap-8">
          {t.steps.items.map((s, i) => (
            <Reveal as="li" key={s.t} delay={i * 70}>
              <p className="text-[13px] font-medium tabular-nums text-[var(--text-soft)]">0{i + 1}</p>
              <h3 className="mt-3 text-[22px] tracking-[-0.5px]">{s.t}</h3>
              <p className="mt-2.5 max-w-[260px] text-[15px] leading-relaxed text-[var(--text-muted)]">{s.d}</p>
              <div className="mt-6">{ICONS[i]}</div>
            </Reveal>
          ))}
        </ol>
      </div>
    </section>
  );
}
