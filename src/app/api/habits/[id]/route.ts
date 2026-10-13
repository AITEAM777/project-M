import { prisma } from "@/lib/db";
import { assertSameWorkspace, loadOwned, parseBody, requireUser, route } from "@/lib/http";
import { habitUpdate } from "@/lib/validation";

export const PATCH = route(async (req, { params }) => {
  const user = await requireUser();
  const habit = await loadOwned(user.id, () => prisma.habit.findUnique({ where: { id: params.id } }), "EDITOR", "Habit");
  const { archived, ...body } = await parseBody(req, habitUpdate);
  await assertSameWorkspace(habit.workspaceId, { goalId: body.goalId });
  return {
    habit: await prisma.habit.update({ where: { id: habit.id }, data: { ...body, archivedAt: archived === undefined ? undefined : archived ? new Date() : null } }),
  };
});

export const DELETE = route(async (_req, { params }) => {
  const user = await requireUser();
  const habit = await loadOwned(user.id, () => prisma.habit.findUnique({ where: { id: params.id } }), "EDITOR", "Habit");
  await prisma.habit.delete({ where: { id: habit.id } });
  return { ok: true };
});
