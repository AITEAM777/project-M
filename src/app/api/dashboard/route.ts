import { prisma } from "@/lib/db";
import { localRanges, route, userAndWorkspace } from "@/lib/http";
import { taskProgress } from "@/lib/progress";
import { listGoals } from "@/server/goals";
import { taskInclude } from "@/server/tasks";

/** One round-trip for every dashboard widget. */
export const GET = route(async (req) => {
  const { workspaceId } = await userAndWorkspace(req);
  const r = localRanges(req);
  const in14 = new Date(r.todayEnd.getTime() + 14 * 86400_000);
  const since28 = new Date(r.todayStart.getTime() - 27 * 86400_000);

  const [today, overdueCount, upcoming, goals, thoughts, projects, maps, completedRecent, createdRecent, habits, events, activity, notes] = await Promise.all([
    prisma.task.findMany({
      where: {
        workspaceId,
        OR: [
          { dueDate: { gte: r.todayStart, lte: r.todayEnd } },
          { scheduledStart: { gte: r.todayStart, lte: r.todayEnd } },
          { dueDate: { lt: r.todayStart }, status: { not: "DONE" } },
          { completedAt: { gte: r.todayStart } },
        ],
      },
      include: taskInclude,
      orderBy: [{ status: "asc" }, { scheduledStart: { sort: "asc", nulls: "last" } }, { priority: "desc" }],
      take: 50,
    }),
    prisma.task.count({ where: { workspaceId, status: { not: "DONE" }, dueDate: { lt: r.todayStart } } }),
    prisma.task.findMany({
      where: { workspaceId, status: { not: "DONE" }, dueDate: { gt: r.todayEnd, lte: in14 } },
      select: { id: true, title: true, dueDate: true, priority: true, project: { select: { title: true, color: true } } },
      orderBy: { dueDate: "asc" },
      take: 10,
    }),
    listGoals(workspaceId, { status: { in: ["ACTIVE", "NOT_STARTED"] } }),
    prisma.note.findMany({
      where: { workspaceId, archivedAt: null },
      orderBy: { createdAt: "desc" },
      take: 6,
      select: { id: true, title: true, kind: true, contentText: true, createdAt: true, tags: true },
    }),
    prisma.project.findMany({
      where: { workspaceId, archivedAt: null, status: { in: ["ACTIVE", "PLANNING"] } },
      include: { tasks: { select: { status: true } } },
      orderBy: { updatedAt: "desc" },
      take: 6,
    }),
    prisma.mindMap.findMany({
      where: { workspaceId, archivedAt: null },
      orderBy: { updatedAt: "desc" },
      take: 5,
      include: { _count: { select: { nodes: true } } },
    }),
    prisma.task.findMany({ where: { workspaceId, completedAt: { gte: since28 } }, select: { completedAt: true } }),
    prisma.note.findMany({ where: { workspaceId, createdAt: { gte: since28 } }, select: { createdAt: true } }),
    prisma.habit.findMany({
      where: { workspaceId, archivedAt: null },
      include: { logs: { where: { date: { gte: new Date(since28.getTime() - 86400_000) } }, select: { date: true, count: true } } },
    }),
    prisma.calendarEvent.findMany({
      where: { workspaceId, OR: [{ start: { gte: r.todayStart, lte: in14 }, recurrence: "NONE" }, { recurrence: { not: "NONE" }, start: { lte: in14 } }] },
      orderBy: { start: "asc" },
      take: 50,
      select: { id: true, title: true, start: true, end: true, color: true, recurrence: true, recurUntil: true, allDay: true },
    }),
    prisma.activity.findMany({ where: { workspaceId }, orderBy: { createdAt: "desc" }, take: 12 }),
    prisma.note.count({ where: { workspaceId, archivedAt: null } }),
  ]);

  // Daily buckets (local days) for the last 28 days.
  const dayIndex = (d: Date) => Math.floor((d.getTime() - since28.getTime()) / 86400_000);
  const completedPerDay = Array(28).fill(0);
  for (const t of completedRecent) if (t.completedAt) { const i = dayIndex(t.completedAt); if (i >= 0 && i < 28) completedPerDay[i]++; }
  const thoughtsPerDay = Array(28).fill(0);
  for (const n of createdRecent) { const i = dayIndex(n.createdAt); if (i >= 0 && i < 28) thoughtsPerDay[i]++; }

  return {
    today: { key: r.todayKey, start: r.todayStart, end: r.todayEnd },
    stats: {
      openToday: today.filter((t) => t.status !== "DONE").length,
      doneToday: today.filter((t) => t.status === "DONE" && t.completedAt && t.completedAt >= r.todayStart).length,
      overdue: overdueCount,
      activeGoals: goals.length,
      notes,
      completedThisWeek: completedRecent.filter((t) => t.completedAt! >= r.weekStart).length,
    },
    todayTasks: today,
    upcoming,
    goals: goals.slice(0, 6),
    thoughts: thoughts.map((t) => ({ ...t, contentText: t.contentText.slice(0, 140) })),
    projects: projects.map(({ tasks, ...p }) => ({ ...p, progress: taskProgress(tasks) })),
    maps,
    trend: { since: since28, completedPerDay, thoughtsPerDay },
    habits: habits.map(({ logs, ...h }) => ({ ...h, counts: Object.fromEntries(logs.map((l) => [l.date.toISOString().slice(0, 10), l.count])) })),
    events,
    activity,
  };
});
