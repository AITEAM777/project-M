import { prisma } from "@/lib/db";
import { parseBody, requireUser, route } from "@/lib/http";
import { limitsFor } from "@/lib/plans";
import { settingsUpdate } from "@/lib/validation";
import { aiAvailable } from "@/server/ai";

export const GET = route(async () => {
  const user = await requireUser();
  const full = await prisma.user.findUniqueOrThrow({ where: { id: user.id }, select: { dashboardLayout: true } });
  return {
    user: { ...user, dashboardLayout: full.dashboardLayout },
    limits: serializeLimits(limitsFor(user.plan)),
    aiAvailable: aiAvailable(),
  };
});

export const PATCH = route(async (req) => {
  const user = await requireUser();
  const body = await parseBody(req, settingsUpdate);
  const updated = await prisma.user.update({
    where: { id: user.id },
    data: {
      name: body.name,
      theme: body.theme,
      locale: body.locale,
      aiEnabled: body.aiEnabled,
      dashboardLayout: body.dashboardLayout,
      onboardedAt: body.onboarded === undefined ? undefined : body.onboarded ? new Date() : null,
    },
    select: { id: true, email: true, name: true, plan: true, theme: true, locale: true, aiEnabled: true, onboardedAt: true, dashboardLayout: true },
  });
  return { user: updated };
});

function serializeLimits(l: object) {
  return Object.fromEntries(Object.entries(l).map(([k, v]) => [k, Number.isFinite(v) ? v : null]));
}
