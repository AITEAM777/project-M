import { prisma } from "@/lib/db";
import { route, userAndWorkspace } from "@/lib/http";
import { limitsFor } from "@/lib/plans";

/** Activity history / timeline of ideas. The free plan sees the last `historyDays` days. */
export const GET = route(async (req) => {
  const { user, workspaceId } = await userAndWorkspace(req);
  const sp = new URL(req.url).searchParams;
  const before = sp.get("before") ? new Date(sp.get("before")!) : undefined;
  const days = limitsFor(user.plan).historyDays;
  const after = Number.isFinite(days) ? new Date(Date.now() - days * 86400_000) : undefined;
  const activity = await prisma.activity.findMany({
    where: { workspaceId, createdAt: { lt: before, gte: after }, ...(sp.get("type") ? { entityType: sp.get("type")! } : {}) },
    orderBy: { createdAt: "desc" },
    take: Math.min(Number(sp.get("limit") || 50), 200),
  });
  return { activity, historyDays: Number.isFinite(days) ? days : null };
});
