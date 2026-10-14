import "server-only";
import { prisma } from "@/lib/db";
import { HttpError } from "@/lib/http";
import { limitsFor, type PlanLimits } from "@/lib/plans";

export type LimitKind = "goals" | "maps" | "habits" | "projects" | "nodes" | "workspaces" | "storage" | "ai";

/**
 * 402 with machine-readable details; the client opens the upgrade dialog for it.
 * Existing data is never touched — only creating more is refused.
 */
export function limitError(kind: LimitKind, max: number, message: string) {
  return new HttpError(402, message, { limit: kind, max });
}

const COUNTERS: Record<"goals" | "maps" | "habits" | "projects", { key: keyof PlanLimits; count: (ws: string) => Promise<number>; message: (n: number) => string }> = {
  goals: {
    key: "activeGoals",
    count: (workspaceId) => prisma.goal.count({ where: { workspaceId, status: { in: ["ACTIVE", "NOT_STARTED", "ON_HOLD"] } } }),
    message: (n) => `Your plan allows ${n} active goals. Complete one or upgrade.`,
  },
  maps: {
    key: "activeMindMaps",
    count: (workspaceId) => prisma.mindMap.count({ where: { workspaceId, archivedAt: null } }),
    message: (n) => `Your plan allows ${n} active mind maps. Archive one or upgrade.`,
  },
  habits: {
    key: "habits",
    count: (workspaceId) => prisma.habit.count({ where: { workspaceId, archivedAt: null } }),
    message: (n) => `Your plan allows ${n} habits. Archive one or upgrade.`,
  },
  projects: {
    key: "projects",
    count: (workspaceId) => prisma.project.count({ where: { workspaceId, archivedAt: null, status: { not: "COMPLETED" } } }),
    message: (n) => `Your plan allows ${n} active projects. Complete one or upgrade.`,
  },
};

export async function assertQuota(kind: keyof typeof COUNTERS, workspaceId: string, plan: string) {
  const c = COUNTERS[kind];
  const max = limitsFor(plan)[c.key] as number;
  if (!Number.isFinite(max)) return;
  if ((await c.count(workspaceId)) >= max) throw limitError(kind, max, c.message(max));
}

export async function usageFor(workspaceId: string, userId: string) {
  const since = new Date(Date.now() - 86400_000);
  const [goals, maps, habits, projects, ai, storage, workspaces] = await Promise.all([
    COUNTERS.goals.count(workspaceId),
    COUNTERS.maps.count(workspaceId),
    COUNTERS.habits.count(workspaceId),
    COUNTERS.projects.count(workspaceId),
    prisma.aiSuggestion.count({ where: { userId, createdAt: { gte: since } } }),
    prisma.attachment.aggregate({ where: { workspace: { ownerId: userId } }, _sum: { size: true } }),
    prisma.workspace.count({ where: { ownerId: userId } }),
  ]);
  return { goals, maps, habits, projects, ai, storageBytes: storage._sum.size ?? 0, workspaces };
}
