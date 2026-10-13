"use client";
import { useEffect, useState } from "react";
import { LOGIN, Logo, SIGNUP, useLanding } from "./ui";
import type { LandingLang } from "./i18n";

function LangSwitch() {
  const { lang, setLang } = useLanding();
  return (
    <div role="radiogroup" aria-label="Language / Мова" className="inline-flex rounded-full border border-[var(--border)] bg-[var(--surface)] p-[3px] text-[12px] font-semibold">
      {(["en", "uk"] as LandingLang[]).map((l) => (
        <button key={l} role="radio" aria-checked={lang === l} onClick={() => setLang(l)}
          className={`h-7 rounded-full px-2.5 transition-colors ${lang === l ? "bg-[var(--brand-tint)] text-[var(--brand)]" : "text-[var(--text-soft)] hover:text-[var(--text)]"}`}>
          {l === "en" ? "EN" : "UA"}
        </button>
      ))}
    </div>
  );
}

export function Header() {
  const { t, signedIn } = useLanding();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 8);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);
  const links = [["#how", t.nav.how], ["#audience", t.nav.audience], ["#features", t.nav.features], ["#faq", t.nav.faq]] as const;
  const startHref = signedIn ? "/dashboard" : SIGNUP;
  const startLabel = signedIn ? t.nav.open : t.nav.start;

  return (
    <header className={`sticky top-0 z-50 transition-[background-color,border-color,backdrop-filter] duration-300 ${scrolled || open ? "border-b border-[var(--border)] bg-[rgba(247,245,240,.82)] backdrop-blur-md" : "border-b border-transparent"}`}>
      <div className="l-container flex h-[68px] items-center gap-6">
        <a href="#top" aria-label="Nodera" className="shrink-0"><Logo /></a>
        <nav aria-label={t.nav.menu} className="hidden flex-1 justify-center gap-9 text-[14.5px] font-medium text-[var(--text-muted)] md:flex">
          {links.map(([href, label]) => <a key={href} href={href} className="transition-colors hover:text-[var(--text)]">{label}</a>)}
        </nav>
        <div className="ml-auto hidden items-center gap-4 md:flex">
          <LangSwitch />
          {!signedIn && <a href={LOGIN} className="text-[14.5px] font-medium text-[var(--text-muted)] hover:text-[var(--text)]">{t.nav.login}</a>}
          <a href={startHref} className="l-btn l-btn-dark">{startLabel}</a>
        </div>
        <button className="ml-auto grid size-10 place-items-center rounded-full border border-[var(--border)] bg-[var(--surface)] md:hidden" aria-expanded={open} aria-controls="l-mobile-menu" aria-label={open ? t.nav.close : t.nav.menu} onClick={() => setOpen(!open)}>
          <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            {open ? <path d="M4 4l10 10M14 4 4 14" /> : <path d="M3 5.5h12M3 9h12M3 12.5h12" />}
          </svg>
        </button>
      </div>
      {open && (
        <div id="l-mobile-menu" className="l-container pb-6 md:hidden">
          <nav aria-label={t.nav.menu} className="flex flex-col border-t border-[var(--border)] pt-2 text-[17px] font-medium">
            {links.map(([href, label]) => <a key={href} href={href} onClick={() => setOpen(false)} className="border-b border-[var(--border)] py-3.5">{label}</a>)}
          </nav>
          <div className="mt-5 flex items-center gap-3">
            <LangSwitch />
            {!signedIn && <a href={LOGIN} className="ml-auto text-[15px] font-medium text-[var(--text-muted)]">{t.nav.login}</a>}
            <a href={startHref} className={`l-btn l-btn-dark ${signedIn ? "ml-auto" : ""}`}>{startLabel}</a>
          </div>
        </div>
      )}
    </header>
  );
}
