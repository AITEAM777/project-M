import { prisma } from "@/lib/db";
import { assertSameWorkspace, logActivity, parseBody, route, userAndWorkspace } from "@/lib/http";
import { habitCreate } from "@/lib/validation";

/** Habits with completion logs for the last `days` days (default 120) as { "YYYY-MM-DD": count }. */
export const GET = route(async (req) => {
  const { workspaceId } = await userAndWorkspace(req);
  const sp = new URL(req.url).searchParams;
  const days = Math.min(Number(sp.get("days") || 120), 400);
  const since = new Date(Date.now() - days * 86400_000);
  const habits = await prisma.habit.findMany({
    where: { workspaceId, archivedAt: sp.get("archived") === "1" ? { not: null } : null },
    orderBy: { createdAt: "asc" },
    include: { goal: { select: { id: true, title: true } }, logs: { where: { date: { gte: since } }, select: { date: true, count: true } } },
  });
  return {
    habits: habits.map(({ logs, ...h }) => ({
      ...h,
      counts: Object.fromEntries(logs.map((l) => [l.date.toISOString().slice(0, 10), l.count])),
    })),
  };
});

export const POST = route(async (req) => {
  const { user, workspaceId } = await userAndWorkspace(req, "EDITOR");
  const body = await parseBody(req, habitCreate);
  await assertSameWorkspace(workspaceId, { goalId: body.goalId });
  const habit = await prisma.habit.create({ data: { ...body, workspaceId } });
  await logActivity(workspaceId, user.id, "created", "habit", habit.id, `Started habit “${habit.title}”`);
  return { habit: { ...habit, counts: {} } };
});
