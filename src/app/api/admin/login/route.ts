import { z } from "zod";
import { prisma } from "@/lib/db";
import { verifyPassword } from "@/lib/auth";
import { HttpError, parseBody, route } from "@/lib/http";
import { email } from "@/lib/validation";
import { clientIp, rateLimit } from "@/server/ratelimit";
import { adminLog, createAdminSession, isAdminEmail } from "@/server/admin";
import { issueCode } from "@/server/email-codes";
import { mailMode } from "@/server/mail";

const DUMMY_HASH = "$2b$12$C6UzMDM.H6dfI/f/IKcEeO5n0o2n0g3pQ3ZG9qk6p5pZ0vXyN2a4K";

/** Step 1: password. Step 2 (when email is configured): a code sent to the admin's inbox. */
export const POST = route(async (req) => {
  const ip = clientIp(req);
  await rateLimit(`admin-login:${ip}`, 5, 15 * 60_000);
  const body = await parseBody(req, z.object({ email, password: z.string().min(1).max(200) }));
  const user = await prisma.user.findUnique({ where: { email: body.email } });
  const ok = await verifyPassword(body.password, user?.passwordHash ?? DUMMY_HASH);
  if (!user || !ok || !isAdminEmail(body.email)) {
    await adminLog(body.email, "login_failed", { ip });
    throw new HttpError(401, "Невірна пошта або пароль");
  }
  if (mailMode() === "off") {
    await createAdminSession(user.id, ip, req.headers.get("user-agent"));
    await adminLog(user.email, "login", { ip, meta: { twoStep: false } });
    return { ok: true };
  }
  const devCode = await issueCode(user.email, "admin", { locale: "uk" });
  return { needsCode: true, email: user.email, devCode };
});
