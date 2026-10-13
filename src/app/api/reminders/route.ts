import { prisma } from "@/lib/db";
import { assertSameWorkspace, parseBody, requireUser, route, userAndWorkspace } from "@/lib/http";
import { reminderCreate } from "@/lib/validation";
import { materializeReminders } from "@/server/reminders";

/**
 * Notifications feed. Reminders whose time has come are "fired" (marked) here;
 * a background worker (scripts/reminder-worker.ts) does the same for push/email.
 */
export const GET = route(async (req) => {
  const user = await requireUser();
  const ws = new URL(req.url).searchParams.get("ws");
  if (ws) await materializeReminders(user.id, ws, req);
  const now = new Date();
  await prisma.reminder.updateMany({ where: { userId: user.id, firedAt: null, remindAt: { lte: now } }, data: { firedAt: now } });
  const [due, upcoming] = await Promise.all([
    prisma.reminder.findMany({ where: { userId: user.id, firedAt: { not: null } }, orderBy: { remindAt: "desc" }, take: 30 }),
    prisma.reminder.findMany({ where: { userId: user.id, firedAt: null }, orderBy: { remindAt: "asc" }, take: 10 }),
  ]);
  return { notifications: due, upcoming, unread: due.filter((r) => !r.readAt).length };
});

export const POST = route(async (req) => {
  const { user, workspaceId } = await userAndWorkspace(req, "EDITOR");
  const body = await parseBody(req, reminderCreate);
  await assertSameWorkspace(workspaceId, { taskId: body.taskId, habitId: body.habitId });
  return { reminder: await prisma.reminder.create({ data: { ...body, userId: user.id } }) };
});

/** Marks all notifications as read. */
export const PATCH = route(async () => {
  const user = await requireUser();
  await prisma.reminder.updateMany({ where: { userId: user.id, firedAt: { not: null }, readAt: null }, data: { readAt: new Date() } });
  return { ok: true };
});
