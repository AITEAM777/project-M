import "server-only";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { collectGoalTasks, goalProgress } from "@/lib/progress";

const taskSel = { id: true, status: true, title: true, dueDate: true, priority: true } as const;

export const goalInclude = {
  milestones: { orderBy: { position: "asc" } },
  tasks: { select: taskSel },
  projects: { select: { id: true, title: true, color: true, status: true, tasks: { select: taskSel } } },
  habits: { where: { archivedAt: null }, select: { id: true, title: true, icon: true, color: true } },
} satisfies Prisma.GoalInclude;

type GoalWith = Prisma.GoalGetPayload<{ include: typeof goalInclude }>;

export function serializeGoal(g: GoalWith) {
  const tasks = collectGoalTasks(g.tasks, g.projects);
  const progress = goalProgress({
    autoProgress: g.autoProgress,
    manualProgress: g.manualProgress,
    status: g.status,
    milestones: g.milestones,
    tasks,
  });
  return {
    ...g,
    projects: g.projects.map((p) => ({ id: p.id, title: p.title, color: p.color, status: p.status, taskCount: p.tasks.length, doneCount: p.tasks.filter((t) => t.status === "DONE").length })),
    taskCount: tasks.length,
    doneTaskCount: tasks.filter((t) => t.status === "DONE").length,
    progress,
  };
}

export async function listGoals(workspaceId: string, where: Prisma.GoalWhereInput = {}) {
  const goals = await prisma.goal.findMany({
    where: { workspaceId, ...where },
    include: goalInclude,
    orderBy: [{ status: "asc" }, { targetDate: "asc" }, { createdAt: "desc" }],
  });
  return goals.map(serializeGoal);
}

export interface GoalDelta { id: string; title: string; before: number; after: number }

/** Current progress of the given goals (id → title + percent). */
export async function goalProgressMap(ids: (string | null | undefined)[]) {
  const uniq = [...new Set(ids.filter((x): x is string => !!x))];
  if (!uniq.length) return new Map<string, { title: string; progress: number }>();
  const goals = await prisma.goal.findMany({
    where: { id: { in: uniq } },
    select: {
      id: true, title: true, status: true, autoProgress: true, manualProgress: true,
      milestones: { select: { done: true } },
      tasks: { select: { id: true, status: true } },
      projects: { select: { tasks: { select: { id: true, status: true } } } },
    },
  });
  return new Map(goals.map((g) => [g.id, { title: g.title, progress: goalProgress({ ...g, tasks: collectGoalTasks(g.tasks, g.projects) }) }]));
}

/** Compares progress snapshots so the client can show "+6% to goal" feedback. */
export async function goalDeltas(before: Map<string, { title: string; progress: number }>): Promise<GoalDelta[]> {
  if (!before.size) return [];
  const after = await goalProgressMap([...before.keys()]);
  return [...before].flatMap(([id, b]) => {
    const a = after.get(id);
    return a && a.progress !== b.progress ? [{ id, title: a.title, before: b.progress, after: a.progress }] : [];
  });
}
