import { prisma } from "@/lib/db";
import { assertSameWorkspace, loadOwned, logActivity, parseBody, requireUser, route } from "@/lib/http";
import { mapUpdate } from "@/lib/validation";
import { assertMapQuota, loadMapGraph } from "@/server/maps";

export const GET = route(async (_req, { params }) => {
  const user = await requireUser();
  const map = await loadOwned(user.id, () => prisma.mindMap.findUnique({ where: { id: params.id }, include: { folder: { select: { id: true, name: true, icon: true } } } }), "VIEWER", "Mind map");
  const graph = await loadMapGraph(map.id);
  await prisma.mindMap.update({ where: { id: map.id }, data: { lastOpenedAt: new Date(), updatedAt: map.updatedAt }, select: { id: true } });
  return { map, ...graph };
});

export const PATCH = route(async (req, { params }) => {
  const user = await requireUser();
  const map = await loadOwned(user.id, () => prisma.mindMap.findUnique({ where: { id: params.id } }), "EDITOR", "Mind map");
  const { archived, ...body } = await parseBody(req, mapUpdate);
  await assertSameWorkspace(map.workspaceId, { folderId: body.folderId });
  if (archived === false && map.archivedAt) await assertMapQuota(map.workspaceId, user.plan);
  const updated = await prisma.mindMap.update({
    where: { id: map.id },
    data: { ...body, archivedAt: archived === undefined ? undefined : archived ? new Date() : null },
  });
  if (archived !== undefined) await logActivity(map.workspaceId, user.id, archived ? "archived" : "restored", "map", map.id, `${archived ? "Archived" : "Restored"} map “${map.title}”`);
  return { map: updated };
});

export const DELETE = route(async (_req, { params }) => {
  const user = await requireUser();
  const map = await loadOwned(user.id, () => prisma.mindMap.findUnique({ where: { id: params.id } }), "EDITOR", "Mind map");
  await prisma.mindMap.delete({ where: { id: map.id } });
  await logActivity(map.workspaceId, user.id, "deleted", "map", map.id, `Deleted map “${map.title}”`);
  return { ok: true };
});
