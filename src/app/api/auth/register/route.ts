import { prisma } from "@/lib/db";
import { createSession, hashPassword } from "@/lib/auth";
import { HttpError, parseBody, route } from "@/lib/http";
import { registerSchema } from "@/lib/validation";
import { bootstrapWorkspace } from "@/server/bootstrap";
import { clientIp, rateLimit } from "@/server/ratelimit";
import { isDisposableEmail } from "@/server/disposable";
import { issueCode } from "@/server/email-codes";
import { mailMode } from "@/server/mail";
import { isAdminEmail } from "@/server/admin";

/**
 * Step 1 of sign-up. With email configured, nothing is created yet: the details wait
 * (password already hashed) until the 6-digit code is confirmed at /api/auth/verify.
 */
export const POST = route(async (req) => {
  // Local development / e2e runs (codes shown on screen, never on Vercel production) sign up many accounts.
  await rateLimit(`register:${clientIp(req)}`, mailMode() === "log" ? 200 : 10, 60 * 60_000);
  const body = await parseBody(req, registerSchema);
  if (isDisposableEmail(body.email)) throw new HttpError(400, "Please use your real email address — temporary inboxes aren't supported.");
  const exists = await prisma.user.findUnique({ where: { email: body.email } });
  if (exists) throw new HttpError(409, "An account with this email already exists");
  const passwordHash = await hashPassword(body.password);
  const locale = body.locale ?? "en";

  if (mailMode() !== "off") {
    await rateLimit(`register-email:${body.email}`, 5, 60 * 60_000);
    const devCode = await issueCode(body.email, "signup", { locale, payload: { name: body.name, passwordHash, locale } });
    return { needsCode: true, email: body.email, devCode };
  }

  // Without email nobody can prove they own an address, so admin addresses can't be claimed this way.
  if (isAdminEmail(body.email)) throw new HttpError(403, "This email can't be used to sign up until email confirmation is set up.");
  const user = await prisma.$transaction(async (tx) => {
    const u = await tx.user.create({ data: { email: body.email, name: body.name, passwordHash, locale } });
    await bootstrapWorkspace(tx, u.id, undefined, locale);
    return u;
  });
  await createSession(user.id, req.headers.get("user-agent"));
  return { user: { id: user.id, email: user.email, name: user.name } };
});
