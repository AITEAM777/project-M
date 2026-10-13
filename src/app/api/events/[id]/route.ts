import { prisma } from "@/lib/db";
import { HttpError, assertSameWorkspace, loadOwned, parseBody, requireUser, route } from "@/lib/http";
import { eventUpdate } from "@/lib/validation";

export const PATCH = route(async (req, { params }) => {
  const user = await requireUser();
  const ev = await loadOwned(user.id, () => prisma.calendarEvent.findUnique({ where: { id: params.id } }), "EDITOR", "Event");
  const { goalIds, ...body } = await parseBody(req, eventUpdate);
  const start = body.start ?? ev.start;
  const end = body.end ?? ev.end;
  if (end <= start) throw new HttpError(400, "End must be after start");
  await assertSameWorkspace(ev.workspaceId, { taskId: body.taskId, habitId: body.habitId });
  if (goalIds?.length && (await prisma.goal.count({ where: { id: { in: goalIds }, workspaceId: ev.workspaceId } })) !== goalIds.length) throw new HttpError(400, "Invalid goal");
  const event = await prisma.$transaction(async (tx) => {
    if (goalIds) {
      await tx.eventGoal.deleteMany({ where: { eventId: ev.id } });
      if (goalIds.length) await tx.eventGoal.createMany({ data: goalIds.map((goalId) => ({ eventId: ev.id, goalId })) });
    }
    if (body.start) {
      // Keep pending reminders aligned with the moved event.
      const delta = body.start.getTime() - ev.start.getTime();
      const rs = await tx.reminder.findMany({ where: { eventId: ev.id, firedAt: null } });
      for (const r of rs) await tx.reminder.update({ where: { id: r.id }, data: { remindAt: new Date(r.remindAt.getTime() + delta) } });
    }
    return tx.calendarEvent.update({ where: { id: ev.id }, data: body });
  });
  return { event };
});

export const DELETE = route(async (_req, { params }) => {
  const user = await requireUser();
  const ev = await loadOwned(user.id, () => prisma.calendarEvent.findUnique({ where: { id: params.id } }), "EDITOR", "Event");
  await prisma.calendarEvent.delete({ where: { id: ev.id } });
  return { ok: true };
});
