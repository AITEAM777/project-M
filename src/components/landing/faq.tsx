"use client";
import { useId, useState } from "react";
import { Reveal, useLanding } from "./ui";

export function FAQ() {
  const { t } = useLanding();
  const [open, setOpen] = useState<number | null>(null);
  const base = useId();
  return (
    <section id="faq" className="l-section scroll-mt-20" aria-labelledby="faq-title">
      <div className="l-container">
        <Reveal>
          <p className="l-kicker">{t.faq.kicker}</p>
          <h2 id="faq-title" className="l-h2 mt-4">{t.faq.title}</h2>
        </Reveal>
        <Reveal delay={80} className="mt-10 border-b border-[var(--border)]">
          {t.faq.items.map((f, i) => {
            const isOpen = open === i;
            return (
              <div key={f.q} className="border-t border-[var(--border)]">
                <h3 className="!font-[family-name:var(--font-body)] !font-medium">
                  <button className="l-acc-btn flex w-full items-center justify-between gap-6 py-5 text-left text-[17px] md:py-6" aria-expanded={isOpen} aria-controls={`${base}-${i}`} id={`${base}-q${i}`} onClick={() => setOpen(isOpen ? null : i)}>
                    {f.q}
                    <span className="l-acc-icon grid size-8 shrink-0 place-items-center rounded-full border border-[var(--border)] bg-white text-[var(--text-muted)]" aria-hidden>
                      <svg width="12" height="12" viewBox="0 0 12 12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><path d="M6 1.5v9M1.5 6h9" /></svg>
                    </span>
                  </button>
                </h3>
                <div id={`${base}-${i}`} role="region" aria-labelledby={`${base}-q${i}`} className="l-acc-panel" data-open={isOpen}>
                  <div className="overflow-hidden">
                    <p className="max-w-[760px] pb-6 text-[16px] leading-relaxed text-[var(--text-muted)]">{f.a}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </Reveal>
      </div>
    </section>
  );
}
