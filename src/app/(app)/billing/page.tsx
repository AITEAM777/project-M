"use client";
import { fmt } from "@/lib/client/format";
import { tr } from "@/lib/i18n";
import { useState } from "react";
import { Check, Clock } from "lucide-react";
import { invalidate, post } from "@/lib/client/api";
import { confirm, toast } from "@/lib/client/store";
import { choosePlan, monthly, planName, useBilling, type Billing, type Period } from "@/lib/client/billing";
import { Button } from "@/components/ui/button";
import { Card, PageSkeleton } from "@/components/ui/misc";
import { COMPARE, FEATURES, TAGLINE } from "@/components/billing/plan-data";
import { Meter, subscriptionLine } from "@/components/billing/plan-widgets";
import { TestModeNote } from "@/components/billing/upgrade-dialog";
import { cn } from "@/lib/utils";

const MB = 1024 * 1024;
const size = (b: number) => (b >= 1000 * MB ? `${(b / (1000 * MB)).toFixed(1)} ГБ` : `${Math.round(b / MB)} МБ`);

export default function BillingPage() {
  const { data: b, mutate } = useBilling();
  const [period, setPeriod] = useState<Period>("year");
  const [busy, setBusy] = useState<string | null>(null);
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
    <div className="mx-auto max-w-6xl">
      <h1 className="text-[1.85rem] font-semibold tracking-tight">{tr("Plan & billing")}</h1>
      <p className="mt-1 text-sm text-muted">{tr("Your plan, what you use and what each plan includes.")}</p>
      {b.mode === "test" && <TestModeNote className="mt-4 text-sm" />}

      <Card className="mt-5 p-5">
        <div className="flex flex-wrap items-start gap-x-8 gap-y-4">
          <div className="min-w-[180px]">
            <p className="text-xs text-muted">{tr("Your plan")}</p>
            <p className="mt-0.5 flex items-center gap-2 text-xl font-semibold">
              {planName(b.plan)}
              <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-semibold", b.plan === "FREE" ? "bg-surface-2 text-muted" : "bg-accent text-accent-fg")}>
                {b.plan === "FREE" ? tr("free") : s?.status === "TRIALING" ? tr("trial") : s?.status === "CANCELED" ? tr("cancelled") : tr("active")}
              </span>
            </p>
            {s && <p className="mt-1 text-sm text-muted">{subscriptionLine(b)}</p>}
            {s && (
              <div className="mt-3 flex flex-wrap gap-2">
                {s.status === "CANCELED"
                  ? <Button size="sm" loading={busy === "/api/billing/resume"} onClick={() => action("/api/billing/resume", "Subscription resumed")}>{tr("Resume subscription")}</Button>
                  : <Button size="sm" loading={busy === "/api/billing/cancel"} onClick={async () => {
                      if (await confirm({ title: tr("Cancel the subscription?"), body: tr("Your plan keeps working until {date}, then you move to Start. Nothing is deleted.", { date: fmt(new Date(s.currentPeriodEnd), "d MMMM") }), confirmLabel: tr("Cancel subscription"), danger: true }))
                        action("/api/billing/cancel", "Subscription cancelled");
                    }}>{tr("Cancel subscription")}</Button>}
              </div>
            )}
          </div>
          <div className="grid flex-1 grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3">
            <Meter label={tr("Active goals")} used={b.usage.goals} max={b.limits.activeGoals} />
            <Meter label={tr("Mind maps")} used={b.usage.maps} max={b.limits.activeMindMaps} />
            <Meter label={tr("Habits")} used={b.usage.habits} max={b.limits.habits} />
            <Meter label={tr("Active projects")} used={b.usage.projects} max={b.limits.projects} />
            <Meter label={tr("AI today")} used={b.usage.ai} max={b.limits.aiRequestsPerDay} />
            <div>
              <div className="flex justify-between text-xs text-muted"><span>{tr("Files")}</span><span className="tabular text-text-2">{size(b.usage.storageBytes)} / {b.limits.storageBytes ? size(b.limits.storageBytes) : "∞"}</span></div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface-3"><div className="h-full rounded-full bg-accent" style={{ width: `${b.limits.storageBytes ? Math.min(100, (b.usage.storageBytes / b.limits.storageBytes) * 100) : 0}%` }} /></div>
            </div>
          </div>
        </div>
      </Card>

      <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">{tr("Choose a plan")}</h2>
        <div role="radiogroup" aria-label={tr("Billing period")} className="inline-flex rounded-full border border-border bg-surface p-1 text-sm font-medium">
          {(["month", "year"] as const).map((p) => (
            <button key={p} role="radio" aria-checked={period === p} onClick={() => setPeriod(p)}
              className={cn("rounded-full px-3.5 py-1.5 transition-colors", period === p ? "bg-text text-surface" : "text-muted hover:text-text")}>
              {p === "month" ? tr("Monthly") : <>{tr("Yearly")} <span className={period === p ? "text-[#7ee2b0]" : "text-success"}>−20%</span></>}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 grid items-start gap-4 lg:grid-cols-3">
        <PlanCard b={b} id="FREE" period={period} busy={busy} onChoose={() => {}} />
        <PlanCard b={b} id="PRO" period={period} busy={busy} popular
          onChoose={() => run("PRO", () => choosePlan("PRO", period, b.trialAvailable && b.plan === "FREE"))} />
        <PlanCard b={b} id="MAX" period={period} busy={busy} onChoose={() => run("MAX", () => choosePlan("MAX", period))} />
      </div>

      <Card className="mt-4 flex flex-wrap items-center gap-3 bg-text p-5 text-surface">
        <div className="min-w-0">
          <p className="font-semibold">{tr("Teams")} <span className="ml-1 rounded-full bg-white/15 px-2 py-0.5 text-[11px] font-semibold">{tr("coming soon")}</span></p>
          <p className="text-sm text-white/70">{tr("Shared spaces, roles, shared maps and team goals.")}</p>
        </div>
        <p className="ml-auto text-sm text-white/70">{tr("from {n} ₴ per person / mo", { n: 199 })}</p>
      </Card>

      <h2 className="mb-3 mt-10 text-lg font-semibold">{tr("Compare plans")}</h2>
      <Card className="overflow-x-auto p-0">
        <table className="w-full min-w-[560px] text-sm">
          <thead>
            <tr className="border-b border-border text-left">
              <th className="px-4 py-3 font-medium text-muted">{tr("Feature")}</th>
              {(["FREE", "PRO", "MAX"] as const).map((p) => <th key={p} className={cn("px-4 py-3 text-center font-semibold", p === "PRO" && "bg-accent-soft text-accent")}>{planName(p)}</th>)}
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

      <ul className="mt-5 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted">
        <li>🔒 {tr("Payment on the provider's secure page")}</li>
        <li>↩ {tr("Cancel in one click")}</li>
        <li>💾 {tr("Your data stays when you change plans")}</li>
        <li>🎓 {tr("−50% for students")}</li>
      </ul>

      {b.mode === "test" && b.plan !== "FREE" && (
        <div className="mt-8 rounded-xl border border-dashed border-border p-4 text-sm">
          <p className="font-medium">{tr("Testing tools")}</p>
          <p className="mt-1 text-muted">{tr("Go back to Start right away, with the free trial available again — to test everything from the beginning.")}</p>
          <Button size="sm" className="mt-3" loading={busy === "/api/billing/reset"} onClick={() => action("/api/billing/reset", "Back on the Start plan")}>{tr("Reset to Start (test)")}</Button>
        </div>
      )}
    </div>
  );
}

function PlanCard({ b, id, period, popular, busy, onChoose }: { b: Billing; id: "FREE" | "PRO" | "MAX"; period: Period; popular?: boolean; busy: string | null; onChoose: () => void }) {
  const current = b.plan === id;
  const f = FEATURES[id];
  const name = planName(id);
  let cta: React.ReactNode;
  if (current) cta = <><Check className="size-4" />{tr("Your plan")}</>;
  else if (id === "FREE") cta = null;
  else if (id === "PRO" && b.trialAvailable && b.plan === "FREE") cta = tr("Try {n} days free", { n: b.trialDays });
  else cta = tr("Choose {plan}", { plan: name });
  return (
    <div className={cn("rounded-2xl border p-5", popular ? "border-transparent bg-gradient-to-b from-[#5B4FE0] to-[#4338CA] text-white shadow-[0_20px_40px_-18px_rgba(67,56,202,.6)]" : "border-border bg-surface")}>
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-lg font-semibold">{name}</h3>
        {popular && <span className="rounded-full bg-[#FFD45C] px-2 py-0.5 text-[11px] font-bold text-[#18181b]">{tr("Most popular")}</span>}
      </div>
      <p className={cn("mt-0.5 min-h-10 text-sm", popular ? "text-white/80" : "text-muted")}>{tr(TAGLINE[id])}</p>
      <p className="mt-3 text-3xl font-semibold tabular">
        {id === "FREE" ? "0 ₴" : `${monthly(b.prices, id, period)} ₴`}
        <span className={cn("ml-1 text-sm font-normal", popular ? "text-white/75" : "text-muted")}>
          {id === "FREE" ? tr("forever") : period === "year" ? tr("/ mo · {n} ₴ a year", { n: b.prices[id].year.toLocaleString("uk-UA") }) : tr("/ mo")}
        </span>
      </p>
      <button disabled={current || id === "FREE" || busy !== null} onClick={onChoose}
        className={cn("mt-4 flex h-10 w-full items-center justify-center gap-1.5 rounded-xl text-sm font-semibold transition-colors disabled:cursor-default",
          current ? (popular ? "bg-white/20 text-white" : "bg-surface-2 text-muted") :
          id === "FREE" ? "bg-surface-2 text-muted" :
          popular ? "bg-white text-[#4338CA] hover:bg-white/90" : "bg-text text-surface hover:opacity-90", !cta && "invisible")}>
        {busy === id ? <span className="size-4 animate-spin rounded-full border-2 border-current/30 border-t-current" /> : cta}
      </button>
      <p className={cn("mb-2 mt-5 text-[11px] font-bold uppercase tracking-[.06em]", popular ? "text-white/70" : "text-muted")}>{tr(f.intro)}</p>
      <ul className="space-y-2 text-sm">
        {f.items.map((it) => (
          <li key={it.text} className={cn("flex gap-2", it.soon && (popular ? "text-white/70" : "text-muted"))}>
            {it.soon ? <Clock className="mt-0.5 size-4 shrink-0 opacity-70" /> : <Check className={cn("mt-0.5 size-4 shrink-0", popular ? "text-white" : "text-success")} />}
            <span>{tr(it.text)}{it.soon && <span className={cn("ml-1.5 rounded-full px-1.5 py-px text-[10.5px] font-semibold", popular ? "bg-white/15" : "bg-surface-2")}>{tr("soon")}</span>}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
