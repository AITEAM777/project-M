import { z } from "zod";
import { prisma } from "@/lib/db";
import { HttpError, loadOwned, notFound, parseBody, requireUser, route } from "@/lib/http";

/** Moves a node (with its entity link) to another map in the same workspace. Its edges are removed. */
export const POST = route(async (req, { params }) => {
  const user = await requireUser();
  const map = await loadOwned(user.id, () => prisma.mindMap.findUnique({ where: { id: params.id }, select: { id: true, workspaceId: true } }), "EDITOR", "Mind map");
  const { targetMapId } = await parseBody(req, z.object({ targetMapId: z.string() }));
  const target = await loadOwned(user.id, () => prisma.mindMap.findUnique({ where: { id: targetMapId }, select: { id: true, workspaceId: true } }), "EDITOR", "Target map");
  if (target.workspaceId !== map.workspaceId) throw new HttpError(400, "Maps must be in the same workspace");
  const node = await prisma.mapNode.findFirst({ where: { id: params.nodeId, mapId: map.id } });
  if (!node) throw notFound("Node (save the map first)");
  const maxX = await prisma.mapNode.aggregate({ where: { mapId: target.id }, _max: { x: true } });
  await prisma.$transaction([
    prisma.mapEdge.deleteMany({ where: { OR: [{ sourceId: node.id }, { targetId: node.id }] } }),
    prisma.mapNode.updateMany({ where: { parentId: node.id, mapId: map.id }, data: { parentId: null } }),
    prisma.mapNode.update({ where: { id: node.id }, data: { mapId: target.id, parentId: null, x: (maxX._max.x ?? 0) + 320, y: 0 } }),
    prisma.mindMap.update({ where: { id: target.id }, data: { updatedAt: new Date() } }),
  ]);
  return { ok: true };
});
