"use client";
import { Reveal, useLanding } from "./ui";

export function Features() {
  const { t } = useLanding();
  return (
    <section id="features" className="l-section scroll-mt-20" aria-labelledby="features-title">
      <div className="l-container">
        <Reveal>
          <p className="l-kicker">{t.features.kicker}</p>
          <h2 id="features-title" className="l-h2 mt-4">{t.features.title}</h2>
        </Reveal>
        <ul className="mt-12 grid gap-x-10 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
          {t.features.items.map((f, i) => (
            <Reveal as="li" key={f.t} delay={(i % 3) * 70} className="border-t-[1.5px] border-[var(--text)] pt-5">
              <h3 className="text-[17px] tracking-[-0.3px]">{f.t}</h3>
              <p className="mt-2 max-w-[330px] text-[15px] leading-relaxed text-[var(--text-muted)]">{f.d}</p>
            </Reveal>
          ))}
        </ul>
      </div>
    </section>
  );
}
