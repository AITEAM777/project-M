import { prisma } from "@/lib/db";
import { loadOwned, requireUser, route } from "@/lib/http";
import { habitStats, utcDayKey } from "@/lib/habits";
import { collectGoalTasks } from "@/lib/progress";

/** The "journey" of a goal for the celebration screen: how long it took and what it took. */
export const GET = route(async (_req, { params }) => {
  const user = await requireUser();
  const goal = await loadOwned(user.id, () => prisma.goal.findUnique({
    where: { id: params.id },
    select: {
      id: true, title: true, createdAt: true, startDate: true, workspaceId: true,
      milestones: { select: { done: true } },
      tasks: { select: { id: true, status: true } },
      projects: { select: { tasks: { select: { id: true, status: true } } } },
      habits: { select: { frequency: true, targetPerPeriod: true, logs: { select: { date: true, count: true } } } },
      nodes: { select: { createdAt: true, kind: true }, orderBy: { createdAt: "asc" }, take: 1 },
    },
  }), "VIEWER", "Goal");
  const tasks = collectGoalTasks(goal.tasks, goal.projects);
  const started = goal.startDate ?? goal.nodes[0]?.createdAt ?? goal.createdAt;
  const bestStreak = Math.max(0, ...goal.habits.map((h) => habitStats(h, Object.fromEntries(h.logs.map((l) => [utcDayKey(l.date), l.count]))).best));
  return {
    story: {
      id: goal.id,
      title: goal.title,
      startedAt: started,
      fromMap: goal.nodes.length > 0,
      days: Math.max(1, Math.round((Date.now() - new Date(started).getTime()) / 86_400_000)),
      tasksDone: tasks.filter((t) => t.status === "DONE").length,
      milestones: { done: goal.milestones.filter((m) => m.done).length, total: goal.milestones.length },
      bestStreak,
    },
  };
});
