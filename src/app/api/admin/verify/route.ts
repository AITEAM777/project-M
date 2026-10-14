import { prisma } from "@/lib/db";
import { HttpError, parseBody, route } from "@/lib/http";
import { verifySchema } from "@/lib/validation";
import { clientIp, rateLimit } from "@/server/ratelimit";
import { adminLog, createAdminSession, isAdminEmail } from "@/server/admin";
import { consumeCode } from "@/server/email-codes";

export const POST = route(async (req) => {
  const ip = clientIp(req);
  await rateLimit(`admin-verify:${ip}`, 10, 15 * 60_000);
  const body = await parseBody(req, verifySchema);
  if (!isAdminEmail(body.email)) throw new HttpError(401, "Невірний код");
  try {
    await consumeCode(body.email, "admin", body.code);
  } catch (err) {
    await adminLog(body.email, "login_failed", { ip, meta: { step: "code" } });
    throw err;
  }
  const user = await prisma.user.findUnique({ where: { email: body.email } });
  if (!user) throw new HttpError(401, "Невірний код");
  await createAdminSession(user.id, ip, req.headers.get("user-agent"));
  await adminLog(user.email, "login", { ip, meta: { twoStep: true } });
  return { ok: true };
});
