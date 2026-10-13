"use client";
import { Reveal, useLanding } from "./ui";

const STYLE = [
  { icon: "🌱", tint: "#E7F1EC", ink: "var(--study-ink)" },
  { icon: "🧭", tint: "#E6ECF4", ink: "var(--insight)" },
  { icon: "🚀", tint: "#F6E8E1", ink: "var(--business-ink)" },
  { icon: "✍️", tint: "#F5EEDF", ink: "var(--health-ink)" },
];

export function Audience() {
  const { t } = useLanding();
  return (
    <section id="audience" className="l-section scroll-mt-20" aria-labelledby="audience-title">
      <div className="l-container">
        <Reveal>
          <p className="l-kicker">{t.audience.kicker}</p>
          <h2 id="audience-title" className="l-h2 mt-4">{t.audience.title}</h2>
        </Reveal>
        <div className="mt-12 grid gap-4 md:grid-cols-2 md:gap-5">
          {t.audience.items.map((a, i) => (
            <Reveal key={a.t} delay={(i % 2) * 80} className="l-card p-7 transition-shadow duration-300 hover:shadow-[0_18px_40px_-26px_rgba(42,44,51,.3)] md:p-8">
              <span className="grid size-11 place-items-center rounded-xl text-[20px]" style={{ background: STYLE[i].tint }} aria-hidden>{STYLE[i].icon}</span>
              <h3 className="mt-6 text-[19px] tracking-[-0.4px]">{a.t}</h3>
              <p className="mt-2.5 max-w-[460px] text-[15.5px] leading-relaxed text-[var(--text-muted)]">{a.d}</p>
              <p className="mt-5 text-[14px] font-semibold" style={{ color: STYLE[i].ink }}>→ {a.r}</p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
