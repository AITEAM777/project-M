import { z } from "zod";
import { parseBody, requireUser, route } from "@/lib/http";
import { startTrial, subscribe } from "@/server/billing";

const schema = z.object({ plan: z.enum(["PRO", "MAX"]), period: z.enum(["month", "year"]).default("month"), trial: z.boolean().optional() });

/**
 * Test mode (no payment provider yet): switches the plan on immediately.
 * With a real provider this will return a checkout URL instead.
 */
export const POST = route(async (req) => {
  const user = await requireUser();
  const body = await parseBody(req, schema);
  if (body.trial && body.plan === "PRO") await startTrial(user.id);
  else await subscribe(user.id, body.plan, body.period);
  return { ok: true, plan: body.plan };
});
