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
