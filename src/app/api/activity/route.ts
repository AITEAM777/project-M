import { prisma } from "@/lib/db";
import { route, userAndWorkspace } from "@/lib/http";

/** Activity history / timeline of ideas. */
export const GET = route(async (req) => {
  const { workspaceId } = await userAndWorkspace(req);
  const sp = new URL(req.url).searchParams;
  const before = sp.get("before") ? new Date(sp.get("before")!) : undefined;
  const activity = await prisma.activity.findMany({
    where: { workspaceId, ...(before ? { createdAt: { lt: before } } : {}), ...(sp.get("type") ? { entityType: sp.get("type")! } : {}) },
    orderBy: { createdAt: "desc" },
    take: Math.min(Number(sp.get("limit") || 50), 200),
  });
  return { activity };
});
