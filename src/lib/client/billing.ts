"use client";
import { getLocale } from "@/lib/i18n";
import { invalidate, post, useApi } from "./api";
import { useUpgrade } from "./store";

export type PlanId = "FREE" | "PRO" | "MAX" | "TEAMS";
export type Period = "month" | "year";

export interface Billing {
  plan: PlanId;
  mode: "test" | "live";
  trialAvailable: boolean;
  trialDays: number;
  memberSince: string;
  subscription: { plan: PlanId; period: "month" | "year" | "trial" | "manual"; status: "TRIALING" | "ACTIVE" | "PAST_DUE" | "CANCELED"; currentPeriodEnd: string; cancelAtPeriodEnd: boolean } | null;
  limits: { activeGoals: number | null; activeMindMaps: number | null; nodesPerMap: number | null; habits: number | null; projects: number | null; workspaces: number | null; storageBytes: number | null; aiRequestsPerDay: number | null; historyDays: number | null; proTools: boolean };
  usage: { goals: number; maps: number; habits: number; projects: number; ai: number; storageBytes: number; workspaces: number };
  prices: Record<"PRO" | "MAX", Record<Period, number>>;
}

export function useBilling() {
  return useApi<Billing>("/api/billing", { revalidateOnFocus: false });
}

/** Free-plan users see the Pro tools locked. */
export function useProTools() {
  const { data } = useBilling();
  return data ? data.limits.proTools : true;
}

export const monthly = (b: Billing["prices"], plan: "PRO" | "MAX", period: Period) => (period === "year" ? Math.round(b[plan].year / 12) : b[plan].month);

/** Test mode: switches the plan on immediately, then shows the welcome dialog. */
export async function choosePlan(plan: "PRO" | "MAX", period: Period, trial = false) {
  await post("/api/billing/checkout", { plan, period, trial });
  await invalidate("/api/billing", "/api/me");
  useUpgrade.getState().setWelcome({ plan, trial });
}


/** Plan names ("Start" is already a different word in the dictionary). */
export function planName(id: string) {
  const uk = getLocale() === "uk";
  if (id === "FREE") return uk ? "Старт" : "Start";
  if (id === "MAX") return uk ? "Максимум" : "Max";
  if (id === "TEAMS") return uk ? "Команди" : "Teams";
  return "Pro";
}
