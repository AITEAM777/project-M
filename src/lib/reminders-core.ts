import { prisma } from "./db";

/**
 * Creates today's reminders for habits with a reminder time and for tasks due today,
 * idempotently. Called from the notifications feed and from the background worker.
 */
export async function materializeReminders(userId: string, workspaceId: string, r: { todayStart: Date; todayEnd: Date } = { todayStart: new Date(new Date().setHours(0, 0, 0, 0)), todayEnd: new Date(new Date().setHours(23, 59, 59, 999)) }) {
  const [habits, tasks, existing] = await Promise.all([
    prisma.habit.findMany({ where: { workspaceId, archivedAt: null, reminderTime: { not: null } }, select: { id: true, title: true, icon: true, reminderTime: true } }),
    prisma.task.findMany({ where: { workspaceId, status: { not: "DONE" }, dueDate: { gte: r.todayStart, lte: r.todayEnd } }, select: { id: true, title: true, dueDate: true } }),
    prisma.reminder.findMany({ where: { userId, remindAt: { gte: r.todayStart, lte: r.todayEnd } }, select: { habitId: true, taskId: true } }),
  ]);
  const haveHabit = new Set(existing.map((e) => e.habitId).filter(Boolean));
  const haveTask = new Set(existing.map((e) => e.taskId).filter(Boolean));
  const data = [
    ...habits
      .filter((h) => !haveHabit.has(h.id))
      .map((h) => {
        const [hh, mm] = h.reminderTime!.split(":").map(Number);
        return { userId, habitId: h.id, title: `${h.icon} Time for: ${h.title}`, remindAt: new Date(r.todayStart.getTime() + (hh * 60 + mm) * 60_000) };
      }),
    ...tasks
      .filter((t) => !haveTask.has(t.id))
      .map((t) => ({ userId, taskId: t.id, title: `Due today: ${t.title}`, remindAt: new Date(r.todayStart.getTime() + 9 * 3600_000) })),
  ];
  if (data.length) await prisma.reminder.createMany({ data });
}
