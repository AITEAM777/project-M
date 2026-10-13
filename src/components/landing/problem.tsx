"use client";
import { Reveal, useLanding } from "./ui";

export function Problem() {
  const { t } = useLanding();
  return (
    <section className="l-section" aria-labelledby="problem-title">
      <div className="l-container">
        <Reveal className="grid gap-8 md:grid-cols-2 md:items-end md:gap-16">
          <div>
            <p className="l-kicker">{t.problem.kicker}</p>
            <h2 id="problem-title" className="l-h2 mt-4 max-w-[520px]">{t.problem.title}</h2>
          </div>
          <p className="max-w-[520px] text-[17px] leading-relaxed text-[var(--text-muted)] md:justify-self-end">{t.problem.text}</p>
        </Reveal>
        <Reveal delay={80} as="ul" className="mt-12 flex flex-wrap gap-2.5">
          {t.problem.clouds.map((c, i) => (
            <li key={c} className="rounded-full border border-dashed border-[#D6D0C4] bg-white/60 px-4 py-2 text-[14.5px] text-[var(--text-muted)]" style={{ transform: `rotate(${[-1, 0.6, -0.4, 0.8, -0.7, 0.3, -0.5, 0.9, -0.2, 0.5][i % 10]}deg)` }}>{c}</li>
          ))}
        </Reveal>
      </div>
    </section>
  );
}
