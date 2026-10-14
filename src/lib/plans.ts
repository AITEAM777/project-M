/**
 * Subscription limits live in ONE place. Nothing else in the codebase should
 * hardcode tier numbers — call `limitsFor(plan)` / the quota helpers instead.
 * `Infinity` means unlimited.
 */
export type PlanId = "FREE" | "PRO" | "MAX" | "TEAMS";
export type PaidPlan = "PRO" | "MAX";
export type Period = "month" | "year";

export interface PlanLimits {
  activeGoals: number;
  activeMindMaps: number;
  nodesPerMap: number;
  habits: number;
  projects: number;
  workspaces: number;
  storageBytes: number;
  aiRequestsPerDay: number;
  /** How far back the timeline goes, in days. */
  historyDays: number;
  /** "Path to goal" view and ready-made map structures. */
  proTools: boolean;
}

const MB = 1024 * 1024;

export const PLAN_LIMITS: Record<PlanId, PlanLimits> = {
  FREE: { activeGoals: 3, activeMindMaps: 3, nodesPerMap: 150, habits: 3, projects: 3, workspaces: 1, storageBytes: 100 * MB, aiRequestsPerDay: 10, historyDays: 30, proTools: false },
  PRO: { activeGoals: Infinity, activeMindMaps: Infinity, nodesPerMap: 2000, habits: Infinity, projects: Infinity, workspaces: 5, storageBytes: 5_000 * MB, aiRequestsPerDay: 200, historyDays: Infinity, proTools: true },
  MAX: { activeGoals: Infinity, activeMindMaps: Infinity, nodesPerMap: 10000, habits: Infinity, projects: Infinity, workspaces: Infinity, storageBytes: 50_000 * MB, aiRequestsPerDay: 1000, historyDays: Infinity, proTools: true },
  TEAMS: { activeGoals: Infinity, activeMindMaps: Infinity, nodesPerMap: 10000, habits: Infinity, projects: Infinity, workspaces: Infinity, storageBytes: 100_000 * MB, aiRequestsPerDay: 1000, historyDays: Infinity, proTools: true },
};

export type Currency = "UAH" | "USD";

/**
 * Prices per currency: hryvnias for the Ukrainian interface, dollars for English.
 * The yearly price is billed once and works out ~20% cheaper per month.
 */
export const PRICES: Record<Currency, Record<PaidPlan, Record<Period, number>>> = {
  UAH: { PRO: { month: 449, year: 4308 }, MAX: { month: 759, year: 7284 } },
  USD: { PRO: { month: 9.99, year: 95.88 }, MAX: { month: 16.99, year: 163.08 } },
};

export const TRIAL_DAYS = 14;

export function limitsFor(plan: string): PlanLimits {
  return PLAN_LIMITS[(plan as PlanId) in PLAN_LIMITS ? (plan as PlanId) : "FREE"];
}

export const isPaid = (plan: string | undefined | null) => !!plan && plan !== "FREE";
