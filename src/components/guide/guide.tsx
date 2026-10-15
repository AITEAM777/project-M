"use client";
import "@fontsource-variable/onest";
import "../landing/landing.css";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ArrowRight, CalendarDays, CheckSquare, FileText, FolderTree, Goal, History, LayoutDashboard, Lightbulb, Link2, Network, Repeat,
  Sparkles, Waypoints, Workflow, type LucideIcon,
} from "lucide-react";
import { setLocale } from "@/lib/i18n";
import { Logo } from "../landing/ui";
import { GUIDE, type GuideLang, type Section } from "./content";

const ICONS: Record<string, LucideIcon> = {
  dashboard: LayoutDashboard, thoughts: Lightbulb, notes: FileText, maps: Workflow, projects: FolderTree, tasks: CheckSquare,
  goals: Goal, calendar: CalendarDays, habits: Repeat, graph: Network, timeline: History, folders: Waypoints,
};
const STAGE_COLORS = ["var(--ideas)", "var(--insight)", "var(--study)", "var(--business)"];
const KEY = "nodera-locale";

/** Public tutorial: every sidebar section in order — what it does, what it links to, where it shows up. */
export function Guide() {
  const [lang, setLang] = useState<GuideLang>("uk");
  useEffect(() => {
    try {
      const q = new URLSearchParams(window.location.search).get("lang");
      if (q === "en" || q === "uk") setLang(q);
      else if (localStorage.getItem(KEY) === "en") setLang("en");
    } catch {}
  }, []);
  useEffect(() => { document.documentElement.lang = lang; }, [lang]);
  const choose = (l: GuideLang) => { setLang(l); setLocale(l); };
  const t = GUIDE[lang];

  return (
    <div className="landing min-h-dvh overflow-x-clip">
      <header className="sticky top-0 z-50 border-b border-[var(--border)] bg-[rgba(247,245,240,.86)] backdrop-blur-md">
        <div className="l-container flex h-[64px] items-center gap-4">
          <Link href="/" aria-label="Nodera" className="shrink-0"><Logo /></Link>
          <div className="ml-auto flex items-center gap-3">
            <div role="radiogroup" aria-label="Language / Мова" className="inline-flex rounded-full border border-[var(--border)] bg-[var(--surface)] p-[3px] text-[12px] font-semibold">
              {(["uk", "en"] as GuideLang[]).map((l) => (
                <button key={l} role="radio" aria-checked={lang === l} onClick={() => choose(l)}
                  className={`h-7 rounded-full px-2.5 transition-colors ${lang === l ? "bg-[var(--brand-tint)] text-[var(--brand)]" : "text-[var(--text-soft)] hover:text-[var(--text)]"}`}>
                  {l === "en" ? "EN" : "UA"}
                </button>
              ))}
            </div>
            <a href="/dashboard" className="l-btn l-btn-dark hidden sm:inline-flex">{t.meta.open}</a>
          </div>
        </div>
      </header>

      <main id="main">
        {/* Hero */}
        <section className="pt-14 pb-4 md:pt-20"><div className="l-container">
          <p className="l-kicker">{t.hero.kicker}</p>
          <h1 className="mt-4 max-w-4xl text-[clamp(34px,5.6vw,60px)] leading-[1.05] tracking-[-1.5px]">{t.hero.title}<br /><span className="l-grad">{t.hero.titleAccent}</span></h1>
          <p className="mt-6 max-w-2xl text-[18px] text-[var(--text-muted)]">{t.hero.lead}</p>
        </div></section>

        {/* Four stages */}
        <section className="pt-16"><div className="l-container">
          <h2 className="text-[26px] md:text-[32px] leading-tight tracking-tight">{t.flow.title}</h2>
          <p className="mt-2 max-w-2xl text-[var(--text-muted)]">{t.flow.lead}</p>
          <ol className="mt-8 grid gap-4 md:grid-cols-4">
            {t.flow.stages.map((s, i) => (
              <li key={s.name} className="l-card l-shadow relative p-5">
                <span className="absolute inset-x-5 top-0 h-[3px] rounded-b-full" style={{ background: STAGE_COLORS[i] }} />
                <p className="l-head text-[17px]">{s.name}</p>
                <p className="mt-1.5 text-[14.5px] leading-snug text-[var(--text-muted)]">{s.text}</p>
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {s.items.map((it) => <span key={it} className="rounded-full px-2.5 py-1 text-[12.5px] font-medium" style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}>{it}</span>)}
                </div>
                {i < 3 && <ArrowRight aria-hidden className="absolute -right-[14px] top-1/2 z-10 hidden size-5 -translate-y-1/2 rounded-full bg-[var(--bg)] text-[var(--text-soft)] md:block" />}
              </li>
            ))}
          </ol>
        </div></section>

        {/* The chain */}
        <section className="pt-16"><div className="l-container">
          <div className="l-card l-shadow p-6 md:p-8">
            <div className="flex items-center gap-2 text-[var(--brand)]"><Link2 className="size-5" /><h2 className="text-[22px] md:text-[26px] leading-tight tracking-tight">{t.chain.title}</h2></div>
            <p className="mt-2 max-w-2xl text-[var(--text-muted)]">{t.chain.lead}</p>
            <ul className="mt-6 divide-y divide-[var(--border)]">
              {t.chain.rows.map((r) => (
                <li key={r.from + r.to} className="grid gap-1 py-3 md:grid-cols-[170px_auto_minmax(0,1.2fr)_minmax(0,1fr)] md:items-center md:gap-4">
                  <span className="font-semibold">{r.from}</span>
                  <ArrowRight aria-hidden className="hidden size-4 text-[var(--brand)] md:block" />
                  <span className="font-semibold text-[var(--brand)]"><span className="md:hidden">→ </span>{r.to}</span>
                  <span className="text-[14.5px] text-[var(--text-muted)]">{r.text}</span>
                </li>
              ))}
            </ul>
          </div>
        </div></section>

        {/* Section-by-section timeline */}
        <section className="pt-20"><div className="l-container">
          <div className="grid gap-10 lg:grid-cols-[230px_minmax(0,1fr)]">
            <nav aria-label={t.meta.toc} className="hidden lg:block">
              <div className="sticky top-[88px]">
                <p className="l-kicker">{t.meta.toc}</p>
                <ol className="mt-3 space-y-0.5">
                  {t.sections.map((s, i) => {
                    const Icon = ICONS[s.id];
                    return (
                      <li key={s.id}>
                        <a href={`#${s.id}`} className="flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-[14.5px] text-[var(--text-muted)] transition-colors hover:bg-[var(--surface)] hover:text-[var(--text)]">
                          <span className="w-5 text-right text-[12px] tabular-nums text-[var(--text-soft)]">{i + 1}</span>
                          <Icon className="size-[17px]" strokeWidth={1.8} />{s.name}
                        </a>
                      </li>
                    );
                  })}
                </ol>
              </div>
            </nav>
            <ol className="relative">
              <span aria-hidden className="absolute bottom-6 left-[21px] top-6 w-px bg-[var(--border)] md:left-[25px]" />
              {t.sections.map((s, i) => <SectionCard key={s.id} s={s} n={i + 1} labels={t.labels} />)}
            </ol>
          </div>
        </div></section>

        {/* Worked example */}
        <section className="pt-20"><div className="l-container">
          <p className="l-kicker">{t.example.kicker}</p>
          <h2 className="l-h2 mt-3">{t.example.title}</h2>
          <p className="mt-3 max-w-2xl text-[var(--text-muted)]">{t.example.lead}</p>
          <ol className="mt-8 grid gap-3 md:grid-cols-2">
            {t.example.steps.map((st, i) => (
              <li key={st.where} className="l-card flex gap-4 p-5">
                <span className="grid size-9 shrink-0 place-items-center rounded-full bg-[var(--brand-tint)] text-[14px] font-bold text-[var(--brand)]">{i + 1}</span>
                <div><p className="font-semibold">{st.where}</p><p className="mt-1 text-[14.5px] leading-snug text-[var(--text-muted)]">{st.text}</p></div>
              </li>
            ))}
          </ol>
        </div></section>

        {/* Cheat sheet + rules */}
        <section className="pt-20"><div className="l-container grid gap-6 lg:grid-cols-[1.3fr_1fr]">
          <div className="l-card l-shadow p-6 md:p-8">
            <h2 className="text-[22px] md:text-[26px] leading-tight tracking-tight">{t.cheat.title}</h2>
            <table className="mt-5 w-full text-left text-[14.5px]">
              <tbody className="divide-y divide-[var(--border)]">
                {t.cheat.rows.map(([q, a]) => (
                  <tr key={q}><td className="py-2.5 pr-4 text-[var(--text-muted)]">{q}</td><td className="py-2.5 font-semibold text-[var(--brand)]">{a}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="l-card l-shadow p-6 md:p-8">
            <h2 className="text-[22px] md:text-[26px] leading-tight tracking-tight">{t.rules.title}</h2>
            <ol className="mt-5 space-y-3">
              {t.rules.items.map((r, i) => (
                <li key={r} className="flex gap-3 text-[15px]"><span className="l-head grid size-7 shrink-0 place-items-center rounded-full bg-[var(--surface-2)] text-[13px] text-[var(--brand)]" style={{ border: "1px solid var(--border)" }}>{i + 1}</span><span className="pt-0.5">{r}</span></li>
              ))}
            </ol>
          </div>
        </div></section>

        {/* CTA */}
        <section className="py-20"><div className="l-container">
          <div className="l-card l-shadow flex flex-col items-start gap-5 p-8 md:flex-row md:items-center md:p-10">
            <div className="flex-1">
              <h2 className="text-[26px] md:text-[32px] leading-tight tracking-tight">{t.cta.title}</h2>
              <p className="mt-2 text-[var(--text-muted)]">{t.cta.text}</p>
            </div>
            <a href="/dashboard" className="l-btn l-btn-primary">{t.cta.button}<span className="l-btn-arrow"><ArrowRight className="size-4" /></span></a>
          </div>
        </div></section>
      </main>
    </div>
  );
}

function Chips({ items, tone }: { items: string[]; tone: "brand" | "plain" }) {
  return (
    <ul className="flex flex-wrap gap-1.5">
      {items.map((it) => (
        <li key={it} className={`rounded-lg px-2.5 py-1 text-[13.5px] leading-snug ${tone === "brand" ? "bg-[var(--brand-tint)] text-[#3F3891]" : "text-[var(--text)]"}`}
          style={tone === "plain" ? { background: "var(--surface-2)", border: "1px solid var(--border)" } : undefined}>{it}</li>
      ))}
    </ul>
  );
}

function SectionCard({ s, n, labels }: { s: Section; n: number; labels: (typeof GUIDE)["uk"]["labels"] }) {
  const Icon = ICONS[s.id];
  return (
    <li id={s.id} className="relative scroll-mt-24 pb-8 pl-14 md:pl-[68px]">
      <span className="absolute left-0 top-1 grid size-[43px] place-items-center rounded-full border border-[var(--border)] bg-[var(--surface)] text-[var(--brand)] shadow-sm md:size-[51px]">
        <Icon className="size-5 md:size-[22px]" strokeWidth={1.8} />
      </span>
      <article className="l-card l-shadow p-5 md:p-7">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span className="text-[13px] font-semibold tabular-nums text-[var(--text-soft)]">{String(n).padStart(2, "0")}</span>
          <h3 className="text-[22px] md:text-[26px] leading-tight tracking-tight">{s.name}</h3>
          <span className="text-[15px] text-[var(--text-muted)]">— {s.tagline}</span>
        </div>
        <p className="mt-3 text-[16px] leading-relaxed">{s.what}</p>

        <h4 className="mt-6 text-[12px] font-semibold uppercase tracking-[2px] text-[var(--brand)]">{labels.how}</h4>
        <ul className="mt-2.5 space-y-2">
          {s.how.map((h) => <li key={h} className="flex gap-2.5 text-[15px] leading-snug"><span aria-hidden className="mt-[7px] size-1.5 shrink-0 rounded-full bg-[var(--brand)]" />{h}</li>)}
        </ul>

        <div className="mt-6 grid gap-5 md:grid-cols-2">
          <div>
            <h4 className="mb-2.5 text-[12px] font-semibold uppercase tracking-[2px] text-[var(--brand)]">{labels.links}</h4>
            {s.links.length ? <Chips items={s.links} tone="brand" /> : <p className="text-[14px] text-[var(--text-muted)]">{labels.none}</p>}
          </div>
          {!!s.shows.length && (
            <div>
              <h4 className="mb-2.5 text-[12px] font-semibold uppercase tracking-[2px] text-[var(--brand)]">{labels.shows}</h4>
              <Chips items={s.shows} tone="plain" />
            </div>
          )}
        </div>

        <div className="mt-6 flex flex-col gap-3 rounded-2xl p-4 sm:flex-row sm:items-center" style={{ background: "#FBF6EC", border: "1px solid #EFE3CB" }}>
          <p className="flex flex-1 gap-2 text-[14.5px] leading-snug"><Sparkles aria-hidden className="mt-0.5 size-4 shrink-0 text-[var(--health)]" /><span><b>{labels.tip}:</b> {s.tip}</span></p>
          <a href={s.href} className="inline-flex shrink-0 items-center gap-1 text-[14px] font-semibold text-[var(--brand)] hover:underline">{labels.openSection}<ArrowRight className="size-4" /></a>
        </div>
      </article>
    </li>
  );
}
