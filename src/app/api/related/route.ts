import { prisma } from "@/lib/db";
import { HttpError, requireUser, route, requireMember } from "@/lib/http";

const FIELD = { note: "noteId", task: "taskId", goal: "goalId", project: "projectId", habit: "habitId" } as const;

/**
 * "Where does this appear?" — every canvas placement of an entity and the thoughts
 * it is connected to on those canvases. Powers cross-navigation between layers.
 */
export const GET = route(async (req) => {
  const user = await requireUser();
  const sp = new URL(req.url).searchParams;
  const type = sp.get("type") as keyof typeof FIELD;
  const id = sp.get("id");
  if (!id || !(type in FIELD)) throw new HttpError(400, "type and id are required");
  const placements = await prisma.mapNode.findMany({
    where: { [FIELD[type]]: id },
    select: { id: true, mapId: true, map: { select: { title: true, workspaceId: true } } },
  });
  if (placements.length) await requireMember(user.id, placements[0].map.workspaceId, "VIEWER");
  const ids = placements.map((p) => p.id);
  const edges = ids.length
    ? await prisma.mapEdge.findMany({
        where: { OR: [{ sourceId: { in: ids } }, { targetId: { in: ids } }] },
        select: {
          id: true, relation: true, label: true, sourceId: true,
          source: { select: { id: true, title: true, kind: true, mapId: true, noteId: true, taskId: true, goalId: true, projectId: true } },
          target: { select: { id: true, title: true, kind: true, mapId: true, noteId: true, taskId: true, goalId: true, projectId: true } },
        },
        take: 60,
      })
    : [];
  return {
    placements: placements.map((p) => ({ nodeId: p.id, mapId: p.mapId, mapTitle: p.map.title })),
    connections: edges.map((e) => {
      const outgoing = ids.includes(e.sourceId);
      return { edgeId: e.id, relation: e.relation, label: e.label, direction: outgoing ? "out" : "in", node: outgoing ? e.target : e.source };
    }),
  };
});
