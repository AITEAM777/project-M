import { prisma } from "@/lib/db";
import { HttpError, assertSameWorkspace, parseBody, route, userAndWorkspace } from "@/lib/http";
import { eventCreate } from "@/lib/validation";

/**
 * Returns raw events (recurrence is expanded on the client with the shared pure
 * helper so it happens in the user's timezone) plus tasks with a scheduled time block
 * or a due date in range.
 */
export const GET = route(async (req) => {
  const { workspaceId } = await userAndWorkspace(req);
  const sp = new URL(req.url).searchParams;
  const from = new Date(sp.get("from") || Date.now() - 7 * 86400_000);
  const to = new Date(sp.get("to") || Date.now() + 35 * 86400_000);
  if (isNaN(from.getTime()) || isNaN(to.getTime())) throw new HttpError(400, "Invalid range");
  const [events, tasks] = await Promise.all([
    prisma.calendarEvent.findMany({
      where: {
        workspaceId,
        OR: [
          { recurrence: "NONE", start: { lt: to }, end: { gt: from } },
          { recurrence: { not: "NONE" }, start: { lt: to }, OR: [{ recurUntil: null }, { recurUntil: { gte: from } }] },
        ],
      },
      include: { goals: { select: { goal: { select: { id: true, title: true } } } }, task: { select: { id: true, title: true, status: true } }, habit: { select: { id: true, title: true, icon: true } } },
      orderBy: { start: "asc" },
    }),
    prisma.task.findMany({
      where: {
        workspaceId,
        OR: [{ scheduledStart: { lt: to }, scheduledEnd: { gt: from } }, { dueDate: { gte: from, lt: to } }],
      },
      select: { id: true, title: true, status: true, priority: true, dueDate: true, scheduledStart: true, scheduledEnd: true, estimateMinutes: true, goalId: true, project: { select: { id: true, title: true, color: true } } },
    }),
  ]);
  return { events: events.map(({ goals, ...e }) => ({ ...e, goals: goals.map((g) => g.goal) })), tasks };
});

export const POST = route(async (req) => {
  const { user, workspaceId } = await userAndWorkspace(req, "EDITOR");
  const { goalIds, reminderMinutes, ...body } = await parseBody(req, eventCreate);
  await assertSameWorkspace(workspaceId, { taskId: body.taskId, habitId: body.habitId });
  if (goalIds?.length && (await prisma.goal.count({ where: { id: { in: goalIds }, workspaceId } })) !== goalIds.length) throw new HttpError(400, "Invalid goal");
  const event = await prisma.calendarEvent.create({
    data: {
      ...body,
      workspaceId,
      goals: goalIds?.length ? { create: goalIds.map((goalId) => ({ goalId })) } : undefined,
      reminders: reminderMinutes != null ? { create: { userId: user.id, title: body.title, remindAt: new Date(body.start.getTime() - reminderMinutes * 60_000) } } : undefined,
    },
  });
  return { event };
});
