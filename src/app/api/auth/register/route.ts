import { prisma } from "@/lib/db";
import { createSession, hashPassword } from "@/lib/auth";
import { HttpError, parseBody, route } from "@/lib/http";
import { registerSchema } from "@/lib/validation";
import { bootstrapWorkspace } from "@/server/bootstrap";
import { clientIp, rateLimit } from "@/server/ratelimit";

export const POST = route(async (req) => {
  rateLimit(`register:${clientIp(req)}`, 10, 60 * 60_000);
  const body = await parseBody(req, registerSchema);
  const exists = await prisma.user.findUnique({ where: { email: body.email } });
  if (exists) throw new HttpError(409, "An account with this email already exists");
  const passwordHash = await hashPassword(body.password);
  const user = await prisma.$transaction(async (tx) => {
    const locale = body.locale ?? "en";
    const u = await tx.user.create({ data: { email: body.email, name: body.name, passwordHash, locale } });
    await bootstrapWorkspace(tx, u.id, undefined, locale);
    return u;
  });
  await createSession(user.id, req.headers.get("user-agent"));
  return { user: { id: user.id, email: user.email, name: user.name } };
});
