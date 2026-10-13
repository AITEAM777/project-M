"use client";
import { Reveal, useLanding } from "./ui";

export function Privacy() {
  const { t } = useLanding();
  return (
    <section id="privacy" className="l-section scroll-mt-20" aria-labelledby="privacy-title">
      <div className="l-container">
        <Reveal className="grid gap-10 rounded-[28px] bg-[var(--brand-tint)] px-7 py-12 md:grid-cols-[1.15fr_1fr] md:items-center md:gap-16 md:px-16 md:py-20">
          <div>
            <p className="l-kicker">{t.privacy.kicker}</p>
            <h2 id="privacy-title" className="l-h2 mt-4 max-w-[520px]">{t.privacy.title}</h2>
            <p className="mt-6 max-w-[440px] text-[17px] leading-relaxed text-[var(--text-muted)]">{t.privacy.text}</p>
          </div>
          <ul className="space-y-0">
            {t.privacy.items.map((it) => (
              <li key={it} className="flex items-center gap-3.5 border-b border-[#D9D5E8] py-4 text-[16px] font-medium last:border-b-0">
                <span className="grid size-7 shrink-0 place-items-center rounded-full bg-white text-[var(--brand)]" aria-hidden>
                  <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M3.5 8.5l3 3 6-7" /></svg>
                </span>
                {it}
              </li>
            ))}
          </ul>
        </Reveal>
      </div>
    </section>
  );
}
