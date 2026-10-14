import "server-only";
import type { MapNode, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { HttpError } from "@/lib/http";
import { limitsFor } from "@/lib/plans";
import { assertQuota, limitError } from "./quota";
import { goalProgress, collectGoalTasks, taskProgress } from "@/lib/progress";
import { utcDayKey } from "@/lib/habits";
import type { EdgeInput, NodeInput } from "@/lib/validation";

function goalSnapshot(goal: {
  id: string; title: string; status: string; autoProgress: boolean; manualProgress: number; targetDate: Date | null;
  milestones: { done: boolean }[]; tasks: { id: string; status: string }[]; projects: { tasks: { id: string; status: string }[] }[];
}) {
  const tasks = collectGoalTasks(goal.tasks, goal.projects);
  return {
    id: goal.id, title: goal.title, status: goal.status, targetDate: goal.targetDate,
    progress: goalProgress({ ...goal, tasks }),
    milestonesDone: goal.milestones.filter((m) => m.done).length, milestonesTotal: goal.milestones.length,
    tasksDone: tasks.filter((t) => t.status === "DONE").length, tasksTotal: tasks.length,
  };
}

/** Linked entity snapshots so nodes can render live status (task done, goal progress...). */
export async function loadMapGraph(mapId: string) {
  const [nodes, edges] = await Promise.all([
    prisma.mapNode.findMany({
      where: { mapId },
      include: {
        task: { select: { id: true, title: true, status: true, dueDate: true, priority: true, estimateMinutes: true, scheduledStart: true } },
        note: { select: { id: true, title: true, contentText: true } },
        goal: {
          select: {
            id: true, title: true, status: true, autoProgress: true, manualProgress: true, targetDate: true,
            milestones: { select: { done: true } },
            tasks: { select: { id: true, status: true } },
            projects: { select: { tasks: { select: { id: true, status: true } } } },
          },
        },
        project: { select: { id: true, title: true, status: true, tasks: { select: { status: true } } } },
        habit: {
          select: {
            id: true, title: true, icon: true, color: true, frequency: true, targetPerPeriod: true,
            // Enough history for streaks and the weekly strip; the client computes stats in local time.
            logs: { where: { date: { gte: new Date(Date.now() - 400 * 86_400_000) } }, select: { date: true, count: true } },
          },
        },
        _count: { select: { attachments: true } },
      },
    }),
    prisma.mapEdge.findMany({ where: { mapId } }),
  ]);
  return {
    nodes: nodes.map(({ task, note, goal, project, habit, _count, ...n }) => ({
      ...n,
      // Linked entity is the source of truth for the title.
      title: task?.title ?? note?.title ?? goal?.title ?? project?.title ?? habit?.title ?? n.title,
      attachmentCount: _count.attachments,
      linked: {
        task: task ?? null,
        note: note ? { id: note.id, title: note.title, preview: note.contentText.slice(0, 160) } : null,
        goal: goal ? goalSnapshot(goal) : null,
        project: project ? { id: project.id, title: project.title, status: project.status, progress: taskProgress(project.tasks).percent, tasksDone: taskProgress(project.tasks).done, tasksTotal: project.tasks.length } : null,
        habit: habit
          ? { id: habit.id, title: habit.title, icon: habit.icon, color: habit.color, frequency: habit.frequency, targetPerPeriod: habit.targetPerPeriod, logs: Object.fromEntries(habit.logs.map((l) => [utcDayKey(l.date), l.count])) }
          : null,
      },
    })),
    edges,
  };
}

const NODE_FIELDS = ["kind", "title", "description", "color", "shape", "icon", "x", "y", "width", "height", "collapsed", "parentId", "tags", "links", "noteId", "taskId", "goalId", "projectId", "habitId"] as const;
const EDGE_FIELDS = ["sourceId", "targetId", "sourceHandle", "targetHandle", "relation", "label", "description", "bidirectional"] as const;

function nodeData(n: NodeInput) {
  return {
    kind: n.kind, title: n.title, description: n.description, color: n.color, shape: n.shape, icon: n.icon,
    x: n.x, y: n.y, width: n.width ?? null, height: n.height ?? null, collapsed: n.collapsed, parentId: n.parentId ?? null,
    tags: n.tags, links: n.links,
    noteId: n.noteId ?? null, taskId: n.taskId ?? null, goalId: n.goalId ?? null, projectId: n.projectId ?? null, habitId: n.habitId ?? null,
  };
}

function changed<T extends Record<string, unknown>>(a: T, b: Record<string, unknown>, fields: readonly string[]) {
  return fields.some((f) => JSON.stringify(a[f] ?? null) !== JSON.stringify(b[f] ?? null));
}

/**
 * Persists a full canvas snapshot by diffing against the DB:
 * creates new, updates changed, deletes missing. Validates every entity reference
 * belongs to the map's workspace. Title edits on linked nodes propagate to the entity.
 */
export async function saveGraph(
  map: { id: string; workspaceId: string },
  plan: string,
  input: { nodes: NodeInput[]; edges: EdgeInput[]; viewport?: { x: number; y: number; zoom: number } },
) {
  const limit = limitsFor(plan).nodesPerMap;
  // Only growth past the limit is refused, so maps made on a bigger plan stay editable.
  if (input.nodes.length > limit && input.nodes.length > (await prisma.mapNode.count({ where: { mapId: map.id } }))) {
    throw limitError("nodes", limit, `Your plan allows up to ${limit} cards per map`);
  }

  const nodeIds = new Set(input.nodes.map((n) => n.id));
  if (nodeIds.size !== input.nodes.length) throw new HttpError(400, "Duplicate node ids");
  for (const n of input.nodes) if (n.parentId && !nodeIds.has(n.parentId)) n.parentId = null;
  const edges = input.edges.filter((e) => nodeIds.has(e.sourceId) && nodeIds.has(e.targetId) && e.sourceId !== e.targetId);

  await validateRefs(map.workspaceId, input.nodes);

  // Node ids are client-generated: make sure none belongs to another map.
  const foreign = await prisma.mapNode.findFirst({ where: { id: { in: [...nodeIds] }, mapId: { not: map.id } }, select: { id: true } });
  if (foreign) throw new HttpError(409, "Node id conflict");
  const foreignEdge = await prisma.mapEdge.findFirst({ where: { id: { in: edges.map((e) => e.id) }, mapId: { not: map.id } }, select: { id: true } });
  if (foreignEdge) throw new HttpError(409, "Edge id conflict");

  const [existingNodes, existingEdges] = await Promise.all([
    prisma.mapNode.findMany({ where: { mapId: map.id } }),
    prisma.mapEdge.findMany({ where: { mapId: map.id } }),
  ]);
  const exN = new Map(existingNodes.map((n) => [n.id, n]));
  const exE = new Map(existingEdges.map((e) => [e.id, e]));

  const ops: Prisma.PrismaPromise<unknown>[] = [];
  const removedNodes = existingNodes.filter((n) => !nodeIds.has(n.id)).map((n) => n.id);
  const edgeIds = new Set(edges.map((e) => e.id));
  const removedEdges = existingEdges.filter((e) => !edgeIds.has(e.id)).map((e) => e.id);
  if (removedEdges.length) ops.push(prisma.mapEdge.deleteMany({ where: { id: { in: removedEdges }, mapId: map.id } }));
  if (removedNodes.length) ops.push(prisma.mapNode.deleteMany({ where: { id: { in: removedNodes }, mapId: map.id } }));

  const toCreate = input.nodes.filter((n) => !exN.has(n.id));
  // Parents first so group references are valid regardless of order (no FK on parentId, but keeps data tidy).
  if (toCreate.length) ops.push(prisma.mapNode.createMany({ data: toCreate.map((n) => ({ id: n.id, mapId: map.id, ...nodeData(n) })) }));
  const titleSync: Prisma.PrismaPromise<unknown>[] = [];
  for (const n of input.nodes) {
    const ex = exN.get(n.id);
    if (!ex) continue;
    const data = nodeData(n);
    if (changed(data, ex as unknown as Record<string, unknown>, NODE_FIELDS)) {
      ops.push(prisma.mapNode.update({ where: { id: n.id }, data }));
      if (data.title !== ex.title && data.title.trim()) titleSync.push(...syncTitle(map.workspaceId, ex, data.title.trim()));
    }
  }
  const newEdges = edges.filter((e) => !exE.has(e.id));
  if (newEdges.length) ops.push(prisma.mapEdge.createMany({ data: newEdges.map((e) => ({ ...edgeData(e), id: e.id, mapId: map.id })) }));
  for (const e of edges) {
    const ex = exE.get(e.id);
    if (ex && changed(edgeData(e), ex as unknown as Record<string, unknown>, EDGE_FIELDS)) {
      ops.push(prisma.mapEdge.update({ where: { id: e.id }, data: edgeData(e) }));
    }
  }
  ops.push(...titleSync);
  ops.push(prisma.mindMap.update({ where: { id: map.id }, data: { updatedAt: new Date(), ...(input.viewport ? { viewport: input.viewport } : {}) } }));
  await prisma.$transaction(ops);
  return { created: toCreate.length, removed: removedNodes.length, edges: edges.length };
}

function edgeData(e: EdgeInput) {
  return {
    sourceId: e.sourceId, targetId: e.targetId, sourceHandle: e.sourceHandle ?? null, targetHandle: e.targetHandle ?? null,
    relation: e.relation, label: e.label, description: e.description, bidirectional: e.bidirectional,
  };
}

function syncTitle(workspaceId: string, n: MapNode, title: string): Prisma.PrismaPromise<unknown>[] {
  const t = title.slice(0, 300);
  const w = { workspaceId };
  if (n.taskId) return [prisma.task.updateMany({ where: { id: n.taskId, ...w }, data: { title: t } })];
  if (n.noteId) return [prisma.note.updateMany({ where: { id: n.noteId, ...w }, data: { title: t } })];
  if (n.goalId) return [prisma.goal.updateMany({ where: { id: n.goalId, ...w }, data: { title: t } })];
  if (n.projectId) return [prisma.project.updateMany({ where: { id: n.projectId, ...w }, data: { title: t } })];
  if (n.habitId) return [prisma.habit.updateMany({ where: { id: n.habitId, ...w }, data: { title: t } })];
  return [];
}

async function validateRefs(workspaceId: string, nodes: NodeInput[]) {
  const collect = (k: "noteId" | "taskId" | "goalId" | "projectId" | "habitId") => [...new Set(nodes.map((n) => n[k]).filter(Boolean) as string[])];
  const checks: [string[], (ids: string[]) => Promise<number>][] = [
    [collect("noteId"), (ids) => prisma.note.count({ where: { id: { in: ids }, workspaceId } })],
    [collect("taskId"), (ids) => prisma.task.count({ where: { id: { in: ids }, workspaceId } })],
    [collect("goalId"), (ids) => prisma.goal.count({ where: { id: { in: ids }, workspaceId } })],
    [collect("projectId"), (ids) => prisma.project.count({ where: { id: { in: ids }, workspaceId } })],
    [collect("habitId"), (ids) => prisma.habit.count({ where: { id: { in: ids }, workspaceId } })],
  ];
  for (const [ids, count] of checks) {
    if (ids.length && (await count(ids)) !== ids.length) throw new HttpError(400, "A node references an item outside this workspace");
  }
}

export function assertMapQuota(workspaceId: string, plan: string) {
  return assertQuota("maps", workspaceId, plan);
}
