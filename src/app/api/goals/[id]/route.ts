import { prisma } from "@/lib/db";
import { HttpError, assertSameWorkspace, loadOwned, logActivity, parseBody, requireUser, route } from "@/lib/http";
import { goalUpdate } from "@/lib/validation";
import { goalInclude, serializeGoal } from "@/server/goals";
import { taskInclude } from "@/server/tasks";

export const GET = route(async (_req, { params }) => {
  const user = await requireUser();
  const goal = await loadOwned(user.id, () => prisma.goal.findUnique({ where: { id: params.id }, include: goalInclude }), "VIEWER", "Goal");
  const [tasks, nodes, dependsOn, dependents, events] = await Promise.all([
    prisma.task.findMany({
      where: { OR: [{ goalId: goal.id }, { project: { goalId: goal.id } }] },
      include: taskInclude,
      orderBy: [{ status: "asc" }, { dueDate: "asc" }],
    }),
    prisma.mapNode.findMany({ where: { goalId: goal.id }, select: { id: true, mapId: true, map: { select: { title: true } } } }),
    prisma.goalDependency.findMany({ where: { goalId: goal.id }, select: { dependsOn: { select: { id: true, title: true, status: true } } } }),
    prisma.goalDependency.findMany({ where: { dependsOnId: goal.id }, select: { goal: { select: { id: true, title: true, status: true } } } }),
    prisma.eventGoal.findMany({ where: { goalId: goal.id }, select: { event: { select: { id: true, title: true, start: true, end: true, recurrence: true } } }, take: 20 }),
  ]);
  // Connected thoughts: nodes directly linked to this goal's nodes on any canvas.
  const nodeIds = nodes.map((n) => n.id);
  const neighbourEdges = nodeIds.length
    ? await prisma.mapEdge.findMany({
        where: { OR: [{ sourceId: { in: nodeIds } }, { targetId: { in: nodeIds } }] },
        select: { relation: true, source: { select: { id: true, title: true, kind: true, mapId: true } }, target: { select: { id: true, title: true, kind: true, mapId: true } }, sourceId: true },
        take: 50,
      })
    : [];
  const connected = neighbourEdges.map((e) => {
    const other = nodeIds.includes(e.sourceId) ? e.target : e.source;
    return { relation: e.relation, node: other };
  });
  return {
    goal: serializeGoal(goal),
    tasks,
    nodes,
    connected,
    dependsOn: dependsOn.map((d) => d.dependsOn),
    dependents: dependents.map((d) => d.goal),
    events: events.map((e) => e.event),
  };
});

export const PATCH = route(async (req, { params }) => {
  const user = await requireUser();
  const goal = await loadOwned(user.id, () => prisma.goal.findUnique({ where: { id: params.id } }), "EDITOR", "Goal");
  const { dependsOn, ...body } = await parseBody(req, goalUpdate);
  await assertSameWorkspace(goal.workspaceId, { folderId: body.folderId });
  if (dependsOn) {
    if (dependsOn.includes(goal.id)) throw new HttpError(400, "A goal cannot depend on itself");
    const n = await prisma.goal.count({ where: { id: { in: dependsOn }, workspaceId: goal.workspaceId } });
    if (n !== dependsOn.length) throw new HttpError(400, "Invalid goal dependency");
  }
  const updated = await prisma.$transaction(async (tx) => {
    if (dependsOn) {
      await tx.goalDependency.deleteMany({ where: { goalId: goal.id } });
      if (dependsOn.length) await tx.goalDependency.createMany({ data: dependsOn.map((d) => ({ goalId: goal.id, dependsOnId: d })) });
    }
    return tx.goal.update({ where: { id: goal.id }, data: body, include: goalInclude });
  });
  if (body.status === "COMPLETED" && goal.status !== "COMPLETED") await logActivity(goal.workspaceId, user.id, "completed", "goal", goal.id, `Achieved goal “${goal.title}” 🎉`);
  return { goal: serializeGoal(updated) };
});

export const DELETE = route(async (_req, { params }) => {
  const user = await requireUser();
  const goal = await loadOwned(user.id, () => prisma.goal.findUnique({ where: { id: params.id } }), "EDITOR", "Goal");
  await prisma.goal.delete({ where: { id: goal.id } });
  await logActivity(goal.workspaceId, user.id, "deleted", "goal", goal.id, `Deleted goal “${goal.title}”`);
  return { ok: true };
});
