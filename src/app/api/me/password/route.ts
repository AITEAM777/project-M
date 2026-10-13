import { prisma } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/auth";
import { HttpError, parseBody, requireUser, route } from "@/lib/http";
import { passwordChange } from "@/lib/validation";

export const POST = route(async (req) => {
  const user = await requireUser();
  const body = await parseBody(req, passwordChange);
  const u = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
  if (!(await verifyPassword(body.current, u.passwordHash))) throw new HttpError(400, "Current password is incorrect");
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash: await hashPassword(body.next) } });
  return { ok: true };
});
