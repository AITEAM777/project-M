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
  prices: Record<Currency, Record<"PRO" | "MAX", Record<Period, number>>>;
}

export function useBilling() {
  return useApi<Billing>("/api/billing", { revalidateOnFocus: false });
}

/** Free-plan users see the Pro tools locked. */
export function useProTools() {
  const { data } = useBilling();
  return data ? data.limits.proTools : true;
}

export type Currency = "UAH" | "USD";

/** Hryvnias for the Ukrainian interface, dollars otherwise. */
export const currency = (): Currency => (getLocale() === "uk" ? "UAH" : "USD");

export function formatPrice(amount: number, cur: Currency = currency()) {
  if (cur === "UAH") return `${Math.round(amount).toLocaleString("uk-UA")} ₴`;
  return amount === 0 ? "$0" : `$${amount.toFixed(2)}`;
}

/** Per-month price; for yearly billing the yearly total divided by 12. */
export const monthly = (b: Billing["prices"], plan: "PRO" | "MAX", period: Period) => {
  const p = b[currency()][plan];
  return formatPrice(period === "year" ? p.year / 12 : p.month);
};
export const yearly = (b: Billing["prices"], plan: "PRO" | "MAX") => formatPrice(b[currency()][plan].year);

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

export const BILLING_URL = "/settings?tab=billing";
