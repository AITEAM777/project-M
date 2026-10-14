import "server-only";
import type { Plan } from "@prisma/client";
import { prisma } from "@/lib/db";

const LIVE = ["TRIALING", "ACTIVE", "PAST_DUE", "CANCELED"] as const;
/** Days a paid subscription keeps working after its period ends while a renewal is being retried. */
const GRACE_DAYS = 3;

/** Admin grants a plan by hand until a date (gift, partner, refund goodwill …). */
export async function grantPlan(userId: string, plan: Plan, until: Date, note?: string) {
  await prisma.$transaction([
    prisma.subscription.updateMany({ where: { userId, status: { in: [...LIVE] } }, data: { status: "EXPIRED" } }),
    prisma.subscription.create({ data: { userId, plan, period: "manual", status: "ACTIVE", currentPeriodEnd: until, provider: "manual", note } }),
    prisma.user.update({ where: { id: userId }, data: { plan } }),
  ]);
}

export async function revokePlan(userId: string) {
  await prisma.$transaction([
    prisma.subscription.updateMany({ where: { userId, status: { in: [...LIVE] } }, data: { status: "EXPIRED", currentPeriodEnd: new Date() } }),
    prisma.user.update({ where: { id: userId }, data: { plan: "FREE" } }),
  ]);
}

/** Ends subscriptions whose paid time ran out and puts their owners back on the free plan. */
export async function expireSubscriptions(now = new Date()) {
  const due = await prisma.subscription.findMany({ where: { status: { in: [...LIVE] }, currentPeriodEnd: { lt: now } } });
  const ended = due.filter((s) => s.provider === "manual" || s.status === "CANCELED" || s.currentPeriodEnd.getTime() + GRACE_DAYS * 86400_000 < now.getTime());
  for (const s of ended) {
    await prisma.subscription.update({ where: { id: s.id }, data: { status: "EXPIRED" } });
    const other = await prisma.subscription.findFirst({ where: { userId: s.userId, status: { in: [...LIVE] }, currentPeriodEnd: { gt: now } }, orderBy: { currentPeriodEnd: "desc" } });
    await prisma.user.update({ where: { id: s.userId }, data: { plan: other?.plan ?? "FREE" } });
  }
  return ended.length;
}

/** Housekeeping for short-lived security rows. */
export async function cleanupAuthRows(now = new Date()) {
  const dayAgo = new Date(now.getTime() - 86400_000);
  await prisma.$transaction([
    prisma.rateLimit.deleteMany({ where: { resetAt: { lt: now } } }),
    prisma.emailCode.deleteMany({ where: { expiresAt: { lt: dayAgo } } }),
    prisma.session.deleteMany({ where: { expiresAt: { lt: now } } }),
    prisma.adminSession.deleteMany({ where: { expiresAt: { lt: now } } }),
  ]);
}
