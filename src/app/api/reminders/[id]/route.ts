import { prisma } from "@/lib/db";
import { notFound, requireUser, route } from "@/lib/http";

export const DELETE = route(async (_req, { params }) => {
  const user = await requireUser();
  const r = await prisma.reminder.deleteMany({ where: { id: params.id, userId: user.id } });
  if (!r.count) throw notFound("Reminder");
  return { ok: true };
});
