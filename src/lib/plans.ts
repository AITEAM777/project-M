/**
 * Subscription limits live in ONE place. Nothing else in the codebase should
 * hardcode tier numbers — call `limitsFor(plan)` / `checkLimit` instead.
 * `Infinity` means unlimited.
 */
export type PlanId = "FREE" | "PRO" | "TEAMS";

export interface PlanLimits {
  activeMindMaps: number;
  nodesPerMap: number;
  workspaces: number;
  storageBytes: number;
  aiRequestsPerDay: number;
  collaborators: number;
}

const MB = 1024 * 1024;

export const PLAN_LIMITS: Record<PlanId, PlanLimits> = {
  FREE: { activeMindMaps: 10, nodesPerMap: 500, workspaces: 3, storageBytes: 100 * MB, aiRequestsPerDay: 10, collaborators: 0 },
  PRO: { activeMindMaps: Infinity, nodesPerMap: 5000, workspaces: 20, storageBytes: 10_000 * MB, aiRequestsPerDay: 200, collaborators: 0 },
  TEAMS: { activeMindMaps: Infinity, nodesPerMap: 10000, workspaces: Infinity, storageBytes: 100_000 * MB, aiRequestsPerDay: 1000, collaborators: Infinity },
};

export function limitsFor(plan: string): PlanLimits {
  return PLAN_LIMITS[(plan as PlanId) in PLAN_LIMITS ? (plan as PlanId) : "FREE"];
}
