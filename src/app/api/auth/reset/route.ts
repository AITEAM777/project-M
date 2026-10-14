import { prisma } from "@/lib/db";
import { createSession, hashPassword } from "@/lib/auth";
import { HttpError, parseBody, route } from "@/lib/http";
import { resetSchema } from "@/lib/validation";
import { clientIp, rateLimit } from "@/server/ratelimit";
import { consumeCode } from "@/server/email-codes";

/** Sets a new password, signs out every other device and signs this one in. */
export const POST = route(async (req) => {
  await rateLimit(`reset:${clientIp(req)}`, 30, 60 * 60_000);
  const body = await parseBody(req, resetSchema);
  await consumeCode(body.email, "reset", body.code);
  const user = await prisma.user.findUnique({ where: { email: body.email } });
  if (!user) throw new HttpError(400, "The code has expired. Request a new one.");
  const passwordHash = await hashPassword(body.password);
  await prisma.$transaction([
    prisma.user.update({ where: { id: user.id }, data: { passwordHash, emailVerifiedAt: user.emailVerifiedAt ?? new Date() } }),
    prisma.session.deleteMany({ where: { userId: user.id } }),
  ]);
  await createSession(user.id, req.headers.get("user-agent"));
  return { ok: true };
});
