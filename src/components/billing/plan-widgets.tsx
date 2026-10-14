"use client";
import { fmt } from "@/lib/client/format";
import { tr } from "@/lib/i18n";
import Link from "next/link";
import { useEffect, useState } from "react";
import { X, Zap } from "lucide-react";
import { planName, useBilling, type Billing } from "@/lib/client/billing";
import { cn } from "@/lib/utils";

const daysLeft = (iso: string) => Math.max(0, Math.ceil((new Date(iso).getTime() - Date.now()) / 86400_000));

export function Meter({ label, used, max, compact }: { label: string; used: number; max: number | null; compact?: boolean }) {
  const pct = max ? Math.min(100, (used / max) * 100) : 0;
  const full = max !== null && used >= max;
  return (
    <div>
      <div className={cn("flex justify-between text-muted", compact ? "text-[11.5px]" : "text-xs")}>
        <span>{label}</span>
        <span className={cn("tabular", full ? "font-semibold text-warning" : "text-text-2")}>{used} / {max ?? "∞"}</span>
      </div>
      {max !== null && (
        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface-3">
          <div className={cn("h-full rounded-full", full ? "bg-warning" : "bg-accent")} style={{ width: `${pct}%` }} />
        </div>
      )}
    </div>
  );
}

/** "Pro · trial, 9 days left" / "Active until 14 Nov" / "Ends 14 Nov". */
export function subscriptionLine(b: Billing) {
  const s = b.subscription;
  if (!s) return null;
  if (s.status === "CANCELED") return tr("Ends {date}", { date: fmt(new Date(s.currentPeriodEnd), "d MMM") });
  if (s.status === "TRIALING") return tr("Free trial · {n} days left", { n: daysLeft(s.currentPeriodEnd) });
  return tr("Active until {date}", { date: fmt(new Date(s.currentPeriodEnd), "d MMM yyyy") });
}

/** Bottom of the sidebar: the plan at a glance. */
export function SidebarPlan() {
  const { data: b } = useBilling();
  if (!b) return null;
  if (b.plan === "FREE") {
    return (
      <div data-tour="plan-card" className="mx-2 mb-2 rounded-xl border border-border bg-gradient-to-b from-surface to-accent-soft/40 p-2.5">
        <div className="mb-2 flex items-center justify-between text-[12.5px] font-semibold">
          <span>{tr("Start plan")}</span>
          <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[10.5px] font-medium text-muted">{tr("free")}</span>
        </div>
        <div className="space-y-1.5">
          <Meter compact label={tr("Goals")} used={b.usage.goals} max={b.limits.activeGoals} />
          <Meter compact label={tr("Mind maps")} used={b.usage.maps} max={b.limits.activeMindMaps} />
          <Meter compact label={tr("AI today")} used={b.usage.ai} max={b.limits.aiRequestsPerDay} />
        </div>
        <Link href="/billing" className="mt-2.5 flex h-8 items-center justify-center gap-1.5 rounded-lg bg-accent text-[12.5px] font-semibold text-accent-fg hover:bg-accent-hover">
          <Zap className="size-3.5" />{tr("Upgrade to Pro")}
        </Link>
      </div>
    );
  }
  return (
    <Link href="/billing" data-tour="plan-card" className="mx-2 mb-2 block rounded-xl border border-border bg-gradient-to-b from-surface to-accent-soft/40 p-2.5 hover:border-accent/40">
      <div className="flex items-center justify-between text-[12.5px] font-semibold">
        <span>{tr("{plan} plan", { plan: planName(b.plan) })}</span>
        <span className="rounded-full bg-accent px-2 py-0.5 text-[10px] font-bold text-accent-fg">{b.plan === "MAX" ? "MAX" : "PRO"}</span>
      </div>
      <p className="mt-1 text-[11.5px] text-muted">{subscriptionLine(b)}</p>
      <p className="mt-1 text-[11.5px] font-semibold text-accent">{tr("Manage plan")} →</p>
    </Link>
  );
}

const BANNER_KEY = "nodera-trial-banner-hidden";

/** Dashboard banner offering the trial — from the second day after sign-up, dismissible for a week. */
export function TrialBanner() {
  const { data: b } = useBilling();
  const [hidden, setHidden] = useState(true);
  useEffect(() => {
    try {
      const until = Number(localStorage.getItem(BANNER_KEY) ?? 0);
      setHidden(until > Date.now());
    } catch {
      setHidden(false);
    }
  }, []);
  if (!b || hidden || !b.trialAvailable) return null;
  if (Date.now() - new Date(b.memberSince).getTime() < 86400_000) return null;
  return (
    <div className="mb-5 flex items-center gap-3 rounded-2xl bg-gradient-to-r from-[#5B4FE0] to-[#7C6CF5] px-4 py-3 text-white">
      <span className="text-2xl" aria-hidden>🎁</span>
      <div className="min-w-0 text-sm">
        <p className="font-semibold">{tr("{n} days of Pro — free", { n: b.trialDays })}</p>
        <p className="text-white/85">{tr("Unlimited goals and maps, Path to goal, ready-made structures and 200 AI requests a day. No card needed.")}</p>
      </div>
      <Link href="/billing" className="ml-auto shrink-0 rounded-lg bg-white px-3 py-1.5 text-sm font-semibold text-[#4338CA] hover:bg-white/90">{tr("Try Pro")}</Link>
      <button aria-label={tr("Hide for a week")} title={tr("Hide for a week")} className="shrink-0 rounded-md p-1 text-white/70 hover:bg-white/10 hover:text-white"
        onClick={() => { try { localStorage.setItem(BANNER_KEY, String(Date.now() + 7 * 86400_000)); } catch {} setHidden(true); }}>
        <X className="size-4" />
      </button>
    </div>
  );
}
