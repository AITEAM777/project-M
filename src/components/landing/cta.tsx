"use client";
import { PrimaryButton, Reveal, SIGNUP, useLanding } from "./ui";

export function CTA() {
  const { t, signedIn } = useLanding();
  return (
    <section className="l-section pb-[clamp(88px,11vw,140px)]" aria-labelledby="cta-title">
      <Reveal className="l-container text-center">
        <h2 id="cta-title" className="l-h2 !text-[clamp(36px,5.4vw,60px)]">{t.cta.titleA}<span className="l-grad">{t.cta.titleHi}</span>{t.cta.titleB}</h2>
        <p className="mt-5 text-[18px] text-[var(--text-muted)]">{t.cta.sub}</p>
        <div className="mt-9 flex justify-center"><PrimaryButton href={signedIn ? "/dashboard" : SIGNUP}>{signedIn ? t.nav.open : t.cta.button}</PrimaryButton></div>
      </Reveal>
    </section>
  );
}
