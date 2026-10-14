"use client";
import "@fontsource-variable/onest";
import "@/components/landing/landing.css";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { initLocale, tr, useLocale, type Locale } from "@/lib/i18n";
import { changeLocale } from "@/components/layout/language-switcher";
import { COPY } from "@/components/landing/i18n";
import { LandingCtx, Logo } from "@/components/landing/ui";
import { H, ThoughtMap, W } from "@/components/landing/thought-map";
import { AuthForm } from "./auth-form";
import { ForgotForm } from "./forgot-form";

function LangPills() {
  const locale = useLocale();
  return (
    <div role="radiogroup" aria-label="Language / Мова" className="inline-flex rounded-full border border-[var(--border)] bg-[var(--surface)] p-[3px] text-[12px] font-semibold">
      {(["en", "uk"] as Locale[]).map((l) => (
        <button key={l} role="radio" aria-checked={locale === l} onClick={() => changeLocale(l, false)}
          className={`h-7 rounded-full px-2.5 transition-colors ${locale === l ? "bg-[var(--brand-tint)] text-[var(--brand)]" : "text-[var(--text-soft)] hover:text-[var(--text)]"}`}>
          {l === "en" ? "EN" : "UA"}
        </button>
      ))}
    </div>
  );
}

/** The landing page's thought map, scaled to the showcase panel. */
function MapShowcase() {
  const locale = useLocale();
  const wrap = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.6);
  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setScale(e.contentRect.width / W));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const ctx = useMemo(() => ({ lang: locale, setLang: () => {}, t: COPY[locale], openVideo: () => {}, signedIn: false }), [locale]);
  return (
    <LandingCtx.Provider value={ctx}>
      <div className="l-shadow overflow-hidden rounded-[20px] border border-[var(--border)] bg-white">
        <div className="flex h-8 items-center gap-2.5 border-b border-[var(--border)] bg-[var(--surface-2)] px-3.5">
          <span className="flex gap-1.5" aria-hidden>{[0, 1, 2].map((i) => <span key={i} className="size-[8px] rounded-full bg-[#E2DDD3]" />)}</span>
          <span className="text-[11.5px] text-[var(--text-soft)]">{COPY[locale].map.url}</span>
        </div>
        <div ref={wrap} className="is-in relative" style={{ height: H * scale }} aria-hidden>
          <div className="absolute left-0 top-0 origin-top-left" style={{ width: W, height: H, transform: `scale(${scale})` }}><ThoughtMap /></div>
        </div>
      </div>
    </LandingCtx.Provider>
  );
}

/** Auth pages share the landing's look; rendered client-side so the saved/browser language applies immediately. */
export function AuthChrome({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  useEffect(() => { initLocale(null); setReady(true); }, []);
  const locale = useLocale();
  if (!ready) return <div className="landing min-h-dvh" />;
  const steps = [tr("Thoughts"), tr("Connections"), tr("Plans"), tr("Progress")];
  return (
    <div key={locale} className="landing auth-scope grid min-h-dvh lg:grid-cols-[minmax(0,1fr)_minmax(0,1.08fr)]">
      <div className="flex flex-col px-5 py-6 sm:px-10 lg:px-14">
        <div className="flex items-center justify-between gap-3">
          <Link href="/" aria-label={tr("Nodera home page")}><Logo /></Link>
          <LangPills />
        </div>
        <div className="flex flex-1 items-center">
          <div className="mx-auto w-full max-w-[400px] py-12">{children}</div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 text-[12.5px] text-[var(--text-soft)]">
          <p className="flex items-center gap-1.5">
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden><rect x="3" y="7" width="10" height="7" rx="2" /><path d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2" /></svg>
            {tr("Your data stays private to your workspace. Export it any time.")}
          </p>
          <Link href="/" className="font-medium hover:text-[var(--text)]">← {tr("Back to home")}</Link>
        </div>
      </div>

      <aside className="relative hidden overflow-hidden p-3 lg:block" aria-label={tr("About Nodera")}>
        <div className="flex h-full flex-col justify-center gap-10 rounded-[28px] px-12 py-12 xl:px-16" style={{ background: "linear-gradient(160deg, #F1EEF7 0%, #ECEAF4 55%, #F3EFE6 100%)" }}>
          <MapShowcase />
          <div>
            <p className="l-kicker">{tr("Your second brain")}</p>
            <h2 className="mt-3 max-w-[540px] text-[clamp(28px,2.6vw,38px)] leading-[1.12] tracking-[-1px]">
              {tr("Turn scattered thoughts into")} <span className="l-grad">{tr("connected plans")}</span>.
            </h2>
            <ol className="mt-7 grid max-w-[560px] grid-cols-4 gap-3 border-t border-[#D9D5E8] pt-5">
              {steps.map((s, i) => (
                <li key={s}>
                  <p className="text-[11.5px] font-medium tabular-nums text-[var(--text-soft)]">0{i + 1}</p>
                  <p className="mt-1 text-[14px] font-semibold">{s}</p>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </aside>
    </div>
  );
}

const HEAD = {
  login: ["Welcome back", "Sign in to continue to your second brain."],
  register: ["Create your Nodera", "A private space for your thoughts, goals and plans."],
  forgot: ["Reset your password", "Enter your email and we'll send you a 6-digit code."],
} as const;

export function AuthPage({ mode, resetEnabled }: { mode: "login" | "register" | "forgot"; resetEnabled?: boolean }) {
  const [codeStep, setCodeStep] = useState(false);
  const [title, lead] = codeStep ? ["Check your email", ""] : HEAD[mode];
  return (
    <>
      {mode !== "forgot" && !codeStep && (
        <nav aria-label={tr("Sign in or sign up")} className="mb-8 grid grid-cols-2 rounded-full border border-[var(--border)] bg-[var(--surface)] p-1 text-[14px] font-semibold">
          <Link href="/login" aria-current={mode === "login" ? "page" : undefined} className={`grid h-10 place-items-center rounded-full transition-colors ${mode === "login" ? "bg-[var(--text)] text-white" : "text-[var(--text-muted)] hover:text-[var(--text)]"}`}>{tr("Log in")}</Link>
          <Link href="/register" aria-current={mode === "register" ? "page" : undefined} className={`grid h-10 place-items-center rounded-full transition-colors ${mode === "register" ? "bg-[var(--text)] text-white" : "text-[var(--text-muted)] hover:text-[var(--text)]"}`}>{tr("Sign up")}</Link>
        </nav>
      )}
      <h1 className="text-[clamp(26px,3vw,32px)] leading-[1.15] tracking-[-0.8px]">{tr(title)}</h1>
      {lead ? <p className="mb-8 mt-2.5 text-[15.5px] leading-relaxed text-[var(--text-muted)]">{tr(lead)}</p> : <div className="mb-4" />}
      {mode === "forgot" ? <ForgotForm onCodeStep={setCodeStep} /> : <AuthForm mode={mode} resetEnabled={resetEnabled} onCodeStep={setCodeStep} />}
    </>
  );
}
