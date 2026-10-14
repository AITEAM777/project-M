import { prisma } from "@/lib/db";
import { route, userAndWorkspace } from "@/lib/http";
import { PRICES, TRIAL_DAYS, limitsFor } from "@/lib/plans";
import { billingMode, currentSubscription, expireSubscriptions } from "@/server/billing";
import { usageFor } from "@/server/quota";

const finite = (l: object) => Object.fromEntries(Object.entries(l).map(([k, v]) => [k, typeof v === "number" && !Number.isFinite(v) ? null : v]));

/** Everything the plan UI needs: current plan, subscription, usage in this workspace, limits and prices. */
export const GET = route(async (req) => {
  const { user, workspaceId } = await userAndWorkspace(req);
  await expireSubscriptions();
  const [fresh, sub, usage] = await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { id: user.id }, select: { plan: true, trialUsedAt: true, createdAt: true } }),
    currentSubscription(user.id),
    usageFor(workspaceId, user.id),
  ]);
  return {
    plan: fresh.plan,
    mode: billingMode(),
    trialAvailable: !fresh.trialUsedAt && fresh.plan === "FREE",
    trialDays: TRIAL_DAYS,
    memberSince: fresh.createdAt,
    subscription: sub && { plan: sub.plan, period: sub.period, status: sub.status, currentPeriodEnd: sub.currentPeriodEnd, cancelAtPeriodEnd: sub.cancelAtPeriodEnd },
    limits: finite(limitsFor(fresh.plan)),
    usage,
    prices: PRICES,
  };
});
