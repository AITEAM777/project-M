import { prisma } from "@/lib/db";
import { HttpError, loadOwned, logActivity, parseBody, requireUser, route } from "@/lib/http";
import { habitLog } from "@/lib/validation";

/** Sets the completion count for a calendar day (0 removes the record). */
export const PUT = route(async (req, { params }) => {
  const user = await requireUser();
  const habit = await loadOwned(user.id, () => prisma.habit.findUnique({ where: { id: params.id } }), "EDITOR", "Habit");
  const body = await parseBody(req, habitLog);
  const date = new Date(`${body.date}T00:00:00.000Z`);
  if (date.getTime() > Date.now() + 2 * 86400_000) throw new HttpError(400, "Cannot log habits in the future");
  if (body.count === 0) {
    await prisma.habitLog.deleteMany({ where: { habitId: habit.id, date } });
  } else {
    const prev = await prisma.habitLog.findUnique({ where: { habitId_date: { habitId: habit.id, date } } });
    await prisma.habitLog.upsert({
      where: { habitId_date: { habitId: habit.id, date } },
      create: { habitId: habit.id, date, count: body.count },
      update: { count: body.count },
    });
    if (!prev && body.count >= habit.targetPerPeriod) await logActivity(habit.workspaceId, user.id, "completed", "habit", habit.id, `${habit.icon} ${habit.title} — done for ${body.date}`);
  }
  return { ok: true, date: body.date, count: body.count };
});
