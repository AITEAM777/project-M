"use client";
import { fmt } from "@/lib/client/format";
import { tr } from "@/lib/i18n";
import { useState } from "react";
import { Check, ChevronDown, Clock } from "lucide-react";
import { invalidate, post } from "@/lib/client/api";
import { confirm, toast } from "@/lib/client/store";
import { choosePlan, monthly, planName, useBilling, type Billing, type Period } from "@/lib/client/billing";
import { Button } from "@/components/ui/button";
import { Card, PageSkeleton } from "@/components/ui/misc";
import { COMPARE, FEATURES, TAGLINE } from "./plan-data";
import { subscriptionLine } from "./plan-widgets";
import { cn } from "@/lib/utils";


/** Three short lines per plan card; the full lists sit under "Compare all features". */
const SHORT: Record<"FREE" | "PRO" | "MAX", string[]> = {
  FREE: ["Unlimited thoughts, notes and tasks", "3 goals · 3 maps · 3 habits", "AI: 10 requests a day"],
  PRO: ["Unlimited goals, maps and habits", "“Path to goal” and ready-made structures", "AI: 200 requests · 5 spaces"],
  MAX: ["Everything in Pro", "AI: 1,000 requests · 10,000 cards", "Unlimited spaces · 50 GB of files"],
};

function UsageBar({ label, used, max }: { label: string; used: number; max: number | null }) {
  const full = max !== null && used >= max;
  return (
    <div className="min-w-0">
      <div className="flex items-baseline justify-between gap-2">
        <span className="truncate font-display text-[13px] font-semibold text-text-2">{label}</span>
        <span className={cn("shrink-0 font-display text-[13px] font-semibold tabular", full && "text-warning")}>{used} / {max ?? "∞"}</span>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-3">
        <div className={cn("h-full rounded-full", full ? "bg-warning" : "bg-accent")} style={{ width: max ? `${Math.min(100, (used / max) * 100)}%` : "0%" }} />
      </div>
    </div>
  );
}

export function BillingPanel() {
  const { data: b, mutate } = useBilling();
  const [period, setPeriod] = useState<Period>("year");
  const [busy, setBusy] = useState<string | null>(null);
  const [more, setMore] = useState(false);
  if (!b) return <PageSkeleton />;

  const run = async (key: string, fn: () => Promise<unknown>) => {
    setBusy(key);
    try {
      await fn();
      await mutate();
    } catch (e) {
      toast.error(e);
    }
    setBusy(null);
  };
  const action = (path: string, msg: string) => run(path, async () => {
    await post(path);
    await invalidate("/api/me");
    toast.success(msg);
  });
  const s = b.subscription;

  return (
    <div>
      <Card className="flex flex-col gap-5 p-5 lg:flex-row lg:items-center lg:gap-8">
        <div className="shrink-0 lg:w-56">
          <p className="text-xs text-muted">{tr("Your plan")}</p>
          <p className="mt-0.5 flex items-center gap-2">
            <span className="font-display text-[22px] font-semibold">{planName(b.plan)}</span>
            <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-semibold", b.plan === "FREE" ? "bg-surface-2 text-muted" : "bg-accent text-accent-fg")}>
              {b.plan === "FREE" ? tr("free") : s?.status === "TRIALING" ? tr("trial") : s?.status === "CANCELED" ? tr("cancelled") : tr("active")}
            </span>
          </p>
          {s && <p className="mt-1 text-[13px] text-muted">{subscriptionLine(b)}</p>}
          {s && (
            <div className="mt-2.5">
              {s.status === "CANCELED"
                ? <Button size="sm" loading={busy === "/api/billing/resume"} onClick={() => action("/api/billing/resume", "Subscription resumed")}>{tr("Resume subscription")}</Button>
                : <Button size="sm" variant="ghost" className="-ml-2 text-muted" loading={busy === "/api/billing/cancel"} onClick={async () => {
                    if (await confirm({ title: tr("Cancel the subscription?"), body: tr("Your plan keeps working until {date}, then you move to Start. Nothing is deleted.", { date: fmt(new Date(s.currentPeriodEnd), "d MMMM") }), confirmLabel: tr("Cancel subscription"), danger: true }))
                      action("/api/billing/cancel", "Subscription cancelled");
                  }}>{tr("Cancel subscription")}</Button>}
            </div>
          )}
        </div>
        <div className="grid flex-1 grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4">
          <UsageBar label={tr("Active goals")} used={b.usage.goals} max={b.limits.activeGoals} />
          <UsageBar label={tr("Mind maps")} used={b.usage.maps} max={b.limits.activeMindMaps} />
          <UsageBar label={tr("Habits")} used={b.usage.habits} max={b.limits.habits} />
          <UsageBar label={tr("AI today")} used={b.usage.ai} max={b.limits.aiRequestsPerDay} />
        </div>
      </Card>

      <div className="mt-7 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">{tr("Choose a plan")}</h2>
        <div role="radiogroup" aria-label={tr("Billing period")} className="inline-flex rounded-full border border-border bg-surface p-1 text-[13.5px] font-medium">
          {(["month", "year"] as const).map((p) => (
            <button key={p} role="radio" aria-checked={period === p} onClick={() => setPeriod(p)}
              className={cn("rounded-full px-3.5 py-1.5 transition-colors", period === p ? "bg-text text-surface" : "text-muted hover:text-text")}>
              {p === "month" ? tr("Monthly") : `${tr("Yearly")} · −20%`}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 grid items-stretch gap-4 lg:grid-cols-3">
        <PlanCard b={b} id="FREE" period={period} busy={busy} onChoose={() => {}} />
        <PlanCard b={b} id="PRO" period={period} busy={busy} popular onChoose={() => run("PRO", () => choosePlan("PRO", period, b.trialAvailable && b.plan === "FREE"))} />
        <PlanCard b={b} id="MAX" period={period} busy={busy} onChoose={() => run("MAX", () => choosePlan("MAX", period))} />
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-[13px] text-muted">
        <span>🔒 {tr("Payment on the provider's secure page")}</span>
        <span>↩ {tr("Cancel in one click")}</span>
        <span>🎓 {tr("−50% for students")}</span>
        <button onClick={() => setMore(!more)} aria-expanded={more} className="ml-auto inline-flex items-center gap-1 font-semibold text-accent hover:underline">
          {more ? tr("Hide details") : tr("Compare all features")}<ChevronDown className={cn("size-4 transition-transform", more && "rotate-180")} />
        </button>
      </div>

      {more && <Details b={b} />}

      {b.mode === "test" && (
        <div className="mt-8 flex flex-wrap items-center gap-3 rounded-xl border border-dashed border-accent/40 bg-accent-soft/50 px-4 py-3 text-[13px] text-accent">
          <span className="flex-1">{tr("Test mode: online payment isn't connected yet — the plan turns on right away, free and without a card.")}</span>
          {b.plan !== "FREE" && <Button size="sm" loading={busy === "/api/billing/reset"} onClick={() => action("/api/billing/reset", "Back on the Start plan")}>{tr("Reset to Start (test)")}</Button>}
        </div>
      )}
    </div>
  );
}

function PlanCard({ b, id, period, popular, busy, onChoose }: { b: Billing; id: "FREE" | "PRO" | "MAX"; period: Period; popular?: boolean; busy: string | null; onChoose: () => void }) {
  const current = b.plan === id;
  const name = planName(id);
  let cta: React.ReactNode = null;
  if (current) cta = <><Check className="size-4" />{tr("Your plan")}</>;
  else if (id === "PRO" && b.trialAvailable && b.plan === "FREE") cta = tr("Try {n} days free", { n: b.trialDays });
  else if (id !== "FREE") cta = tr("Choose {plan}", { plan: name });
  return (
    <div className={cn("flex flex-col rounded-2xl border p-6", popular ? "border-transparent bg-gradient-to-b from-[#5B4FE0] to-[#4338CA] text-white shadow-[0_24px_48px_-20px_rgba(67,56,202,.65)]" : "border-border bg-surface")}>
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-[19px] font-semibold">{name}</h3>
        {popular && <span className="rounded-full bg-[#FFD45C] px-2.5 py-0.5 text-[11.5px] font-bold text-[#18181b]">{tr("Most popular")}</span>}
      </div>
      <p className={cn("mt-1 text-[13.5px]", popular ? "text-white/75" : "text-muted")}>{tr(TAGLINE[id])}</p>
      <p className="mt-6 flex flex-wrap items-baseline gap-x-2">
        <span className="font-display text-[38px] font-semibold leading-none tracking-tight">{id === "FREE" ? "0 ₴" : `${monthly(b.prices, id, period)} ₴`}</span>
        <span className={cn("text-[13px]", popular ? "text-white/75" : "text-muted")}>
          {id === "FREE" ? tr("forever") : period === "year" ? tr("/ mo · {n} ₴ a year", { n: b.prices[id].year.toLocaleString("uk-UA") }) : tr("/ mo")}
        </span>
      </p>
      <button disabled={current || !cta || busy !== null} onClick={onChoose}
        className={cn("mt-5 flex h-11 w-full items-center justify-center gap-1.5 rounded-xl text-[14.5px] font-semibold transition-colors disabled:cursor-default",
          current || !cta ? (popular ? "bg-white/20 text-white" : "bg-surface-2 text-muted") :
          popular ? "bg-white text-[#4338CA] hover:bg-white/90" : "bg-text text-surface hover:opacity-90")}>
        {busy === id ? <span className="size-4 animate-spin rounded-full border-2 border-current/30 border-t-current" /> : cta ?? tr("Included for everyone")}
      </button>
      <ul className="mt-5 space-y-2 text-[13.5px]">
        {SHORT[id].map((t) => (
          <li key={t} className="flex gap-2"><Check className={cn("mt-0.5 size-4 shrink-0", popular ? "text-white" : "text-success")} />{tr(t)}</li>
        ))}
      </ul>
    </div>
  );
}

function Details({ b }: { b: Billing }) {
  return (
    <div className="mt-6 space-y-6">
      <div className="grid gap-4 lg:grid-cols-3">
        {(["FREE", "PRO", "MAX"] as const).map((id) => (
          <Card key={id} className="p-5">
            <p className="font-display text-[15px] font-semibold">{planName(id)}</p>
            <p className="mb-2 mt-3 text-[11px] font-bold uppercase tracking-[.06em] text-muted">{tr(FEATURES[id].intro)}</p>
            <ul className="space-y-2 text-[13.5px]">
              {FEATURES[id].items.map((it) => (
                <li key={it.text} className={cn("flex gap-2", it.soon && "text-muted")}>
                  {it.soon ? <Clock className="mt-0.5 size-4 shrink-0 opacity-70" /> : <Check className="mt-0.5 size-4 shrink-0 text-success" />}
                  <span>{tr(it.text)}{it.soon && <span className="ml-1.5 rounded-full bg-surface-2 px-1.5 py-px text-[10.5px] font-semibold">{tr("soon")}</span>}</span>
                </li>
              ))}
            </ul>
          </Card>
        ))}
      </div>
      <Card className="overflow-x-auto p-0">
        <table className="w-full min-w-[560px] text-sm">
          <thead>
            <tr className="border-b border-border text-left">
              <th className="px-4 py-3 font-medium text-muted">{tr("Feature")}</th>
              {(["FREE", "PRO", "MAX"] as const).map((p) => <th key={p} className={cn("px-4 py-3 text-center font-semibold", p === "PRO" && "bg-accent-soft text-accent", b.plan === p && "underline decoration-2 underline-offset-4")}>{planName(p)}</th>)}
            </tr>
          </thead>
          <tbody>
            {COMPARE.map(([label, ...v]) => (
              <tr key={label} className="border-b border-border last:border-0">
                <td className="px-4 py-2.5 text-text-2">{tr(label)}</td>
                {v.map((x, i) => <td key={i} className={cn("px-4 py-2.5 text-center tabular", i === 1 && "bg-accent-soft/50", x === "✓" && "font-bold text-success", x === "—" && "text-muted")}>{tr(x)}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
      <Card className="flex flex-wrap items-center gap-3 bg-text p-5 text-surface">
        <div className="min-w-0">
          <p className="font-semibold">{tr("Teams")} <span className="ml-1 rounded-full bg-white/15 px-2 py-0.5 text-[11px] font-semibold">{tr("coming soon")}</span></p>
          <p className="text-sm text-white/70">{tr("Shared spaces, roles, shared maps and team goals.")}</p>
        </div>
        <p className="ml-auto text-sm text-white/70">{tr("from {n} ₴ per person / mo", { n: 199 })}</p>
      </Card>
    </div>
  );
}
