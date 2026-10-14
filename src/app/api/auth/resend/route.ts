import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { HttpError, parseBody, route } from "@/lib/http";
import { resendSchema } from "@/lib/validation";
import { clientIp, rateLimit } from "@/server/ratelimit";
import { issueCode, latestPayload } from "@/server/email-codes";

export const POST = route(async (req) => {
  await rateLimit(`resend:${clientIp(req)}`, 10, 60 * 60_000);
  const body = await parseBody(req, resendSchema);
  await rateLimit(`resend-email:${body.email}`, 5, 60 * 60_000);
  if (body.purpose === "signup") {
    const payload = await latestPayload(body.email, "signup");
    if (!payload) throw new HttpError(400, "The code has expired. Request a new one.");
    const locale = (payload as { locale?: string }).locale;
    return { ok: true, devCode: await issueCode(body.email, "signup", { locale, payload: payload as Prisma.InputJsonValue }) };
  }
  const user = await prisma.user.findUnique({ where: { email: body.email }, select: { locale: true } });
  // Same answer whether or not the account exists.
  if (!user) return { ok: true };
  return { ok: true, devCode: await issueCode(body.email, "reset", { locale: user.locale }) };
});
