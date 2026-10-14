import { prisma } from "@/lib/db";
import { HttpError, parseBody, route } from "@/lib/http";
import { forgotSchema } from "@/lib/validation";
import { clientIp, rateLimit } from "@/server/ratelimit";
import { issueCode } from "@/server/email-codes";
import { mailMode } from "@/server/mail";

/** Sends a reset code. Answers the same way whether or not the account exists. */
export const POST = route(async (req) => {
  if (mailMode() === "off") throw new HttpError(503, "Password reset by email isn't available yet.");
  await rateLimit(`forgot:${clientIp(req)}`, 10, 60 * 60_000);
  const body = await parseBody(req, forgotSchema);
  await rateLimit(`forgot-email:${body.email}`, 3, 60 * 60_000);
  const user = await prisma.user.findUnique({ where: { email: body.email }, select: { locale: true } });
  if (!user) return { needsCode: true, email: body.email };
  const devCode = await issueCode(body.email, "reset", { locale: user.locale ?? body.locale });
  return { needsCode: true, email: body.email, devCode };
});
