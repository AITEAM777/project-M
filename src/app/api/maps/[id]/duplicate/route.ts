import { prisma } from "@/lib/db";
import { loadOwned, requireUser, route } from "@/lib/http";
import { uid } from "@/lib/utils";
import { assertMapQuota } from "@/server/maps";

/** Duplicates a map. Copied nodes keep their entity references (no duplicated tasks/goals). */
export const POST = route(async (_req, { params }) => {
  const user = await requireUser();
  const map = await loadOwned(user.id, () => prisma.mindMap.findUnique({ where: { id: params.id }, include: { nodes: true, edges: true } }), "EDITOR", "Mind map");
  await assertMapQuota(map.workspaceId, user.plan);
  const ids = new Map(map.nodes.map((n) => [n.id, uid("n_")]));
  const copy = await prisma.$transaction(async (tx) => {
    const m = await tx.mindMap.create({ data: { workspaceId: map.workspaceId, folderId: map.folderId, title: `${map.title} (copy)`, description: map.description, viewport: map.viewport ?? undefined } });
    await tx.mapNode.createMany({
      data: map.nodes.map(({ createdAt: _c, updatedAt: _u, ...n }) => ({ ...n, id: ids.get(n.id)!, mapId: m.id, parentId: n.parentId ? ids.get(n.parentId) ?? null : null })),
    });
    await tx.mapEdge.createMany({
      data: map.edges.map(({ createdAt: _c, updatedAt: _u, ...e }) => ({ ...e, id: uid("e_"), mapId: m.id, sourceId: ids.get(e.sourceId)!, targetId: ids.get(e.targetId)! })),
    });
    return m;
  });
  return { map: copy };
});
