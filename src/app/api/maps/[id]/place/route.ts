import { z } from "zod";
import { prisma } from "@/lib/db";
import { HttpError, loadOwned, parseBody, requireUser, route } from "@/lib/http";
import { uid } from "@/lib/utils";

const body = z.object({ type: z.enum(["note", "task", "goal", "project", "habit"]), id: z.string() });
const KIND = { note: "NOTE", task: "TASK", goal: "GOAL", project: "PROJECT", habit: "HABIT" } as const;

/** Places an existing entity on a map as a linked node (no duplication). Returns the node id. */
export const POST = route(async (req, { params }) => {
  const user = await requireUser();
  const map = await loadOwned(user.id, () => prisma.mindMap.findUnique({ where: { id: params.id }, select: { id: true, workspaceId: true } }), "EDITOR", "Mind map");
  const b = await parseBody(req, body);
  const where = { id: b.id, workspaceId: map.workspaceId };
  const ent =
    b.type === "note" ? await prisma.note.findFirst({ where, select: { title: true, kind: true } }) :
    b.type === "task" ? await prisma.task.findFirst({ where, select: { title: true } }) :
    b.type === "goal" ? await prisma.goal.findFirst({ where, select: { title: true } }) :
    b.type === "project" ? await prisma.project.findFirst({ where, select: { title: true } }) :
    await prisma.habit.findFirst({ where, select: { title: true } });
  if (!ent) throw new HttpError(404, "Item not found");
  const existing = await prisma.mapNode.findFirst({ where: { mapId: map.id, [`${b.type}Id`]: b.id }, select: { id: true } });
  if (existing) return { nodeId: existing.id, existed: true };
  const bounds = await prisma.mapNode.aggregate({ where: { mapId: map.id }, _max: { x: true }, _min: { y: true } });
  const id = uid("n_");
  const kind = b.type === "note" && "kind" in ent && ent.kind === "THOUGHT" ? "THOUGHT" : KIND[b.type];
  await prisma.$transaction([
    prisma.mapNode.create({ data: { id, mapId: map.id, kind, title: ent.title, x: (bounds._max.x ?? -300) + 300, y: bounds._min.y ?? 0, [`${b.type}Id`]: b.id } }),
    prisma.mindMap.update({ where: { id: map.id }, data: { updatedAt: new Date() } }),
  ]);
  return { nodeId: id, existed: false };
});
