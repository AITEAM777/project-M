"use client";
import { fmt } from "@/lib/client/format";
import { tr } from "@/lib/i18n";
import Link from "next/link";
import { useState } from "react";
import { Check } from "lucide-react";
import { toast, useUpgrade, type UpgradeReason } from "@/lib/client/store";
import { BILLING_URL, choosePlan, monthly, planName, useBilling, type Period } from "@/lib/client/billing";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const COPY: Record<UpgradeReason, { icon: string; title: string; body: string }> = {
  goals: { icon: "🎯", title: "Another goal — great pace!", body: "The Start plan keeps {n} active goals at once. Pro removes the limit — or complete or pause one of your goals." },
  maps: { icon: "🕸️", title: "Room for one more map?", body: "Start includes {n} active mind maps. Pro gives you unlimited maps — or archive one you no longer need." },
  habits: { icon: "🔁", title: "Building lots of habits!", body: "Start includes {n} habits. With Pro you can track as many as you like." },
  projects: { icon: "📁", title: "Another project on the go", body: "Start includes {n} active projects. Pro removes the limit — or complete one first." },
  nodes: { icon: "🧩", title: "This map is full", body: "Your plan allows {n} cards per map. Pro allows up to 2,000, Max up to 10,000." },
  workspaces: { icon: "🗂️", title: "Another space?", body: "Your plan includes {n} space(s). Pro gives you 5 — work, home, study — and Max unlimited." },
  storage: { icon: "📎", title: "Your storage is full", body: "Pro includes 5 GB of files and Max 50 GB." },
  ai: { icon: "✨", title: "More help from AI", body: "You've used today's {n} AI requests. Pro gives you 200 a day and Max 1,000." },
  path: { icon: "🧭", title: "What blocks your goal?", body: "“Path to goal” shows what's already done, what stands in the way — such as an unanswered question — and the very next step." },
  structures: { icon: "🧱", title: "Ready-made structures", body: "Startup launch, SWOT, 5 whys, pros & cons, goal → milestones → tasks — added to your map in one click." },
  history: { icon: "🕰️", title: "Your whole history", body: "Start shows the last 30 days of the timeline. Pro keeps everything, from your very first thought." },
  generic: { icon: "⚡", title: "Unlock Nodera Pro", body: "Unlimited goals and maps, Path to goal, ready-made structures and 200 AI requests a day." },
};

const PERKS = ["Unlimited goals, habits, projects and maps", "“Path to goal” and ready-made structures", "AI assistant: 200 requests a day"];

export function TestModeNote({ className }: { className?: string }) {
  return (
    <p className={cn("rounded-lg border border-dashed border-accent/40 bg-accent-soft/60 px-3 py-2 text-xs text-accent", className)}>
      {tr("Test mode: online payment isn't connected yet — the plan turns on right away, free and without a card.")}
    </p>
  );
}

/** Opens on a plan limit (402) or a locked Pro tool. */
export function UpgradeDialog() {
  const { reason, max, close } = useUpgrade();
  const { data: billing } = useBilling();
  const [period, setPeriod] = useState<Period>("year");
  const [busy, setBusy] = useState(false);
  if (!reason || !billing) return null;
  const c = COPY[reason];
  const trial = billing.trialAvailable;
  const paidPro = billing.plan === "PRO";
  const target = paidPro ? "MAX" : "PRO";

  async function go() {
    setBusy(true);
    try {
      await choosePlan(target, period, trial && target === "PRO");
    } catch (e) {
      toast.error(e);
    }
    setBusy(false);
  }

  return (
    <Dialog open onClose={close} size="sm">
      <div className="pt-1 text-[34px] leading-[1.15]" aria-hidden>{c.icon}</div>
      <h2 className="mt-3 text-lg font-semibold leading-snug">{tr(c.title)}</h2>
      <p className="mt-1.5 text-sm text-muted">{tr(c.body, { n: max ?? "" })}</p>
      <ul className="mt-4 space-y-1.5 text-sm">
        {(target === "MAX" ? ["AI assistant: 1,000 requests a day", "Up to 10,000 cards per map", "Unlimited spaces · 50 GB of files"] : PERKS).map((p) => (
          <li key={p} className="flex gap-2"><Check className="mt-0.5 size-4 shrink-0 text-success" />{tr(p)}</li>
        ))}
      </ul>
      {!(trial && target === "PRO") && (
        <div className="mt-4 grid grid-cols-2 gap-2" role="radiogroup" aria-label={tr("Billing period")}>
          {(["month", "year"] as const).map((p) => (
            <button key={p} role="radio" aria-checked={period === p} onClick={() => setPeriod(p)}
              className={cn("rounded-xl border px-3 py-2 text-left text-sm transition-colors", period === p ? "border-accent bg-accent-soft" : "border-border hover:bg-surface-2")}>
              <span className="block text-xs text-muted">{p === "month" ? tr("Monthly") : <>{tr("Yearly")} <b className="text-success">−20%</b></>}</span>
              <b className="tabular">{monthly(billing.prices, target, p)}</b> <span className="text-xs text-muted">{tr("/ mo")}</span>
            </button>
          ))}
        </div>
      )}
      <Button variant="primary" className="mt-4 w-full" loading={busy} onClick={go}>
        {trial && target === "PRO" ? tr("Try Pro free for {n} days", { n: billing.trialDays }) : target === "MAX" ? tr("Switch to Max") : tr("Switch to Pro")}
      </Button>
      {billing.mode === "test" && <TestModeNote className="mt-3" />}
      <div className="mt-3 flex items-center justify-between text-sm">
        <button onClick={close} className="text-muted hover:text-text">{tr("Not now")}</button>
        <Link href={BILLING_URL} onClick={close} className="font-medium text-accent hover:underline">{tr("Compare all plans")} →</Link>
      </div>
    </Dialog>
  );
}

/** Shown right after a plan is switched on. */
export function WelcomeDialog() {
  const { welcome, setWelcome } = useUpgrade();
  const { data: billing } = useBilling();
  if (!welcome) return null;
  const until = billing?.subscription?.currentPeriodEnd;
  const perks = welcome.plan === "MAX"
    ? ["Limits are lifted: goals, maps, habits and projects", "AI assistant: 1,000 requests a day", "Up to 10,000 cards per map", "Unlimited spaces · 50 GB of files"]
    : ["Limits are lifted: goals, maps, habits and projects", "“Path to goal” and ready-made structures are open", "AI assistant: 200 requests a day", "Full timeline history"];
  return (
    <Dialog open onClose={() => setWelcome(null)} size="sm">
      <div className="text-center">
        <div className="mx-auto grid size-16 place-items-center rounded-full bg-success text-3xl text-white shadow-[0_0_0_10px_var(--success-soft)]" aria-hidden>✓</div>
        <h2 className="mt-5 text-xl font-semibold">{tr("Welcome to {plan}!", { plan: planName(welcome.plan) })}</h2>
        <p className="mt-1.5 text-sm text-muted">
          {welcome.trial && until ? tr("Your free trial runs until {date}. Nothing is charged automatically.", { date: fmt(new Date(until), "d MMMM") })
            : until ? tr("Active until {date}.", { date: fmt(new Date(until), "d MMMM yyyy") }) : null}
        </p>
      </div>
      <ul className="mt-5 space-y-2 text-sm">
        {perks.map((p) => <li key={p} className="flex gap-2"><Check className="mt-0.5 size-4 shrink-0 text-success" />{tr(p)}</li>)}
      </ul>
      <Button variant="primary" className="mt-5 w-full" onClick={() => setWelcome(null)}>{tr("Continue")}</Button>
    </Dialog>
  );
}
