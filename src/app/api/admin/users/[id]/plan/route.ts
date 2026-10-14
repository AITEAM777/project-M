import { z } from "zod";
import { prisma } from "@/lib/db";
import { notFound, parseBody, route } from "@/lib/http";
import { clientIp } from "@/server/ratelimit";
import { adminLog } from "@/server/admin";
import { requireAdmin } from "@/server/admin-api";
import { grantPlan, revokePlan } from "@/server/billing";

const grantSchema = z.object({
  plan: z.enum(["PRO", "MAX", "TEAMS"]),
  until: z.coerce.date().refine((d) => d.getTime() > Date.now(), "The date must be in the future"),
  note: z.string().trim().max(300).optional(),
});

export const POST = route(async (req, { params }) => {
  const admin = await requireAdmin();
  const body = await parseBody(req, grantSchema);
  const user = await prisma.user.findUnique({ where: { id: params.id }, select: { id: true, email: true } });
  if (!user) throw notFound("User");
  await grantPlan(user.id, body.plan, body.until, body.note);
  await adminLog(admin.email, "grant_plan", { target: user.email, ip: clientIp(req), meta: { plan: body.plan, until: body.until.toISOString(), note: body.note ?? null } });
  return { ok: true };
});

export const DELETE = route(async (req, { params }) => {
  const admin = await requireAdmin();
  const user = await prisma.user.findUnique({ where: { id: params.id }, select: { id: true, email: true } });
  if (!user) throw notFound("User");
  await revokePlan(user.id);
  await adminLog(admin.email, "revoke_plan", { target: user.email, ip: clientIp(req) });
  return { ok: true };
});
