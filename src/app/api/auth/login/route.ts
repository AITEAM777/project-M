import { prisma } from "@/lib/db";
import { createSession, verifyPassword } from "@/lib/auth";
import { HttpError, parseBody, route } from "@/lib/http";
import { loginSchema } from "@/lib/validation";
import { clientIp, rateLimit } from "@/server/ratelimit";

// Constant-time-ish fallback hash so unknown emails take as long as wrong passwords.
const DUMMY_HASH = "$2b$12$C6UzMDM.H6dfI/f/IKcEeO5n0o2n0g3pQ3ZG9qk6p5pZ0vXyN2a4K";

export const POST = route(async (req) => {
  const body = await parseBody(req, loginSchema);
  await rateLimit(`login:${clientIp(req)}:${body.email}`, 10, 15 * 60_000);
  const user = await prisma.user.findUnique({ where: { email: body.email } });
  const ok = await verifyPassword(body.password, user?.passwordHash ?? DUMMY_HASH);
  if (!user || !ok) {
    throw new HttpError(401, "Invalid email or password");
  }
  await createSession(user.id, req.headers.get("user-agent"));
  return { user: { id: user.id, email: user.email, name: user.name } };
});
