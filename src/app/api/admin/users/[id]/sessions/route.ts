import { prisma } from "@/lib/db";
import { notFound, route } from "@/lib/http";
import { clientIp } from "@/server/ratelimit";
import { adminLog } from "@/server/admin";
import { requireAdmin } from "@/server/admin-api";

/** Signs the user out on every device (e.g. after a suspected account takeover). */
export const DELETE = route(async (req, { params }) => {
  const admin = await requireAdmin();
  const user = await prisma.user.findUnique({ where: { id: params.id }, select: { id: true, email: true } });
  if (!user) throw notFound("User");
  const { count } = await prisma.session.deleteMany({ where: { userId: user.id } });
  await adminLog(admin.email, "logout_user", { target: user.email, ip: clientIp(req), meta: { sessions: count } });
  return { ok: true, count };
});
