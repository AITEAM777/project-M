import "server-only";
import { createHash, randomBytes } from "crypto";
import { cookies, headers } from "next/headers";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { isAdminHost, parseAdminEmails } from "@/lib/admin-host";

export { isAdminHost };

export const ADMIN_COOKIE = "nodera_admin";
const ADMIN_SESSION_HOURS = 12;

/** Admins are listed in the ADMIN_EMAILS environment variable (comma-separated), never in code. */
export function adminEmails() {
  return parseAdminEmails(process.env.ADMIN_EMAILS);
}

export function isAdminEmail(email: string) {
  return adminEmails().includes(email.trim().toLowerCase());
}

const hashToken = (t: string) => createHash("sha256").update(t).digest("hex");

export async function createAdminSession(userId: string, ip: string, userAgent: string | null) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + ADMIN_SESSION_HOURS * 3600_000);
  await prisma.adminSession.create({ data: { id: hashToken(token), userId, expiresAt, ip, userAgent: userAgent?.slice(0, 250) } });
  // Host-only cookie: it is sent to admin.<domain> and nowhere else.
  (await cookies()).set(ADMIN_COOKIE, token, {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
}

export type AdminUser = { id: string; email: string; name: string };

/** The signed-in admin, or null. Re-checks ADMIN_EMAILS so removing an email revokes access at once. */
export async function getAdmin(): Promise<AdminUser | null> {
  const h = await headers();
  if (!isAdminHost(h.get("host"))) return null;
  const token = (await cookies()).get(ADMIN_COOKIE)?.value;
  if (!token) return null;
  const s = await prisma.adminSession.findUnique({ where: { id: hashToken(token) }, include: { user: { select: { id: true, email: true, name: true } } } });
  if (!s || s.expiresAt < new Date()) return null;
  if (!isAdminEmail(s.user.email)) return null;
  return s.user;
}

export async function destroyAdminSession() {
  const jar = await cookies();
  const token = jar.get(ADMIN_COOKIE)?.value;
  if (token) await prisma.adminSession.deleteMany({ where: { id: hashToken(token) } });
  jar.delete(ADMIN_COOKIE);
}

export async function adminLog(email: string, action: string, opts: { target?: string; meta?: Prisma.InputJsonValue; ip?: string } = {}) {
  await prisma.adminLog.create({ data: { email, action, target: opts.target, meta: opts.meta, ip: opts.ip } });
}
