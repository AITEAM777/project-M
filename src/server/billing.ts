import "server-only";
import type { Plan } from "@prisma/client";
import { prisma } from "@/lib/db";
import { HttpError } from "@/lib/http";
import { TRIAL_DAYS, type PaidPlan, type Period } from "@/lib/plans";

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
  // Only real paid renewals get a grace period; trials, gifts, test plans and cancellations end on time.
  const ended = due.filter((s) => s.provider === "manual" || s.provider === "test" || s.status === "CANCELED" || s.status === "TRIALING" || s.currentPeriodEnd.getTime() + GRACE_DAYS * 86400_000 < now.getTime());
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

// ── Self-service subscriptions ──────────────────────────────────────────────

/**
 * "test": no payment provider is connected yet — choosing a plan switches it on at once,
 * so every screen can be tried. Set BILLING_PROVIDER once real checkout exists.
 */
export function billingMode(): "test" | "live" {
  return process.env.BILLING_PROVIDER ? "live" : "test";
}

export async function currentSubscription(userId: string) {
  return prisma.subscription.findFirst({
    where: { userId, status: { in: [...LIVE] }, currentPeriodEnd: { gt: new Date() } },
    orderBy: { currentPeriodEnd: "desc" },
  });
}

const addPeriod = (from: Date, period: Period | "trial") => {
  const d = new Date(from);
  if (period === "trial") d.setDate(d.getDate() + TRIAL_DAYS);
  else if (period === "year") d.setFullYear(d.getFullYear() + 1);
  else d.setMonth(d.getMonth() + 1);
  return d;
};

function assertTestMode() {
  if (billingMode() !== "test") throw new HttpError(409, "Online payment isn't available yet.");
}

/** 14 days of Pro, once per account. */
export async function startTrial(userId: string) {
  assertTestMode();
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { trialUsedAt: true, plan: true } });
  if (user.trialUsedAt) throw new HttpError(409, "The free trial has already been used on this account.");
  if (user.plan !== "FREE") throw new HttpError(409, "You already have a paid plan.");
  const now = new Date();
  await prisma.$transaction([
    prisma.subscription.create({ data: { userId, plan: "PRO", period: "trial", status: "TRIALING", currentPeriodEnd: addPeriod(now, "trial"), provider: "test" } }),
    prisma.user.update({ where: { id: userId }, data: { plan: "PRO", trialUsedAt: now } }),
  ]);
}

/** Test-mode checkout: the plan is switched on immediately for one period. */
export async function subscribe(userId: string, plan: PaidPlan, period: Period) {
  assertTestMode();
  const now = new Date();
  const { trialUsedAt } = await prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { trialUsedAt: true } });
  await prisma.$transaction([
    prisma.subscription.updateMany({ where: { userId, status: { in: [...LIVE] } }, data: { status: "EXPIRED", currentPeriodEnd: now } }),
    prisma.subscription.create({ data: { userId, plan, period, status: "ACTIVE", currentPeriodEnd: addPeriod(now, period), provider: "test" } }),
    // A paid plan uses up the trial, so it can't be taken after cancelling.
    prisma.user.update({ where: { id: userId }, data: { plan, trialUsedAt: trialUsedAt ?? now } }),
  ]);
}

/** Cancels renewal; the plan keeps working until the end of the paid (or trial) period. */
export async function cancelSubscription(userId: string) {
  const sub = await currentSubscription(userId);
  if (!sub) throw new HttpError(404, "No active subscription");
  await prisma.subscription.update({ where: { id: sub.id }, data: { status: "CANCELED", cancelAtPeriodEnd: true } });
}

export async function resumeSubscription(userId: string) {
  const sub = await currentSubscription(userId);
  if (!sub || sub.status !== "CANCELED") throw new HttpError(404, "Nothing to resume");
  await prisma.subscription.update({ where: { id: sub.id }, data: { status: sub.period === "trial" ? "TRIALING" : "ACTIVE", cancelAtPeriodEnd: false } });
}

/** Test mode only: back to the free plan right now, with the trial available again. */
export async function resetToFree(userId: string) {
  assertTestMode();
  await revokePlan(userId);
  await prisma.user.update({ where: { id: userId }, data: { trialUsedAt: null } });
}
