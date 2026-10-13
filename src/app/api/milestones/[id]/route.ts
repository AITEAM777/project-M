import { prisma } from "@/lib/db";
import { loadOwned, logActivity, parseBody, requireUser, route } from "@/lib/http";
import { milestoneUpdate } from "@/lib/validation";
import { goalDeltas, goalProgressMap } from "@/server/goals";

const load = (userId: string, id: string) =>
  loadOwned(userId, async () => {
    const m = await prisma.milestone.findUnique({ where: { id }, include: { goal: { select: { workspaceId: true, title: true } } } });
    return m ? { ...m, workspaceId: m.goal.workspaceId } : null;
  }, "EDITOR", "Milestone");

export const PATCH = route(async (req, { params }) => {
  const user = await requireUser();
  const m = await load(user.id, params.id);
  const body = await parseBody(req, milestoneUpdate);
  const before = body.done !== undefined && body.done !== m.done ? await goalProgressMap([m.goalId]) : new Map<string, { title: string; progress: number }>();
  const milestone = await prisma.milestone.update({
    where: { id: m.id },
    data: { ...body, completedAt: body.done === undefined ? undefined : body.done ? new Date() : null },
  });
  if (body.done && !m.done) await logActivity(m.workspaceId, user.id, "completed", "milestone", m.id, `Reached milestone “${m.title}” (${m.goal.title})`);
  return { milestone, goals: await goalDeltas(before) };
});

export const DELETE = route(async (_req, { params }) => {
  const user = await requireUser();
  const m = await load(user.id, params.id);
  await prisma.milestone.delete({ where: { id: m.id } });
  return { ok: true };
});
