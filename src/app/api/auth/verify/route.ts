import { prisma } from "@/lib/db";
import { createSession } from "@/lib/auth";
import { HttpError, parseBody, route } from "@/lib/http";
import { verifySchema } from "@/lib/validation";
import { bootstrapWorkspace } from "@/server/bootstrap";
import { clientIp, rateLimit } from "@/server/ratelimit";
import { consumeCode } from "@/server/email-codes";

/** Step 2 of sign-up: the code proves the email is real, then the account is created. */
export const POST = route(async (req) => {
  await rateLimit(`verify:${clientIp(req)}`, 30, 60 * 60_000);
  const body = await parseBody(req, verifySchema);
  const row = await consumeCode(body.email, "signup", body.code);
  const p = row.payload as { name?: string; passwordHash?: string; locale?: string } | null;
  if (!p?.name || !p.passwordHash) throw new HttpError(400, "The code has expired. Request a new one.");
  if (await prisma.user.findUnique({ where: { email: body.email } })) throw new HttpError(409, "An account with this email already exists");
  const locale = p.locale === "uk" ? "uk" : "en";
  const user = await prisma.$transaction(async (tx) => {
    const u = await tx.user.create({ data: { email: body.email, name: p.name!, passwordHash: p.passwordHash!, locale, emailVerifiedAt: new Date() } });
    await bootstrapWorkspace(tx, u.id, undefined, locale);
    return u;
  });
  await createSession(user.id, req.headers.get("user-agent"));
  return { user: { id: user.id, email: user.email, name: user.name } };
});
