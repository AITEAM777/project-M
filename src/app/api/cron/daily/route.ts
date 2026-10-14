import { HttpError, route } from "@/lib/http";
import { logger } from "@/lib/logger";
import { cleanupAuthRows, expireSubscriptions } from "@/server/billing";

/**
 * Runs once a day (vercel.json → crons). Vercel sends `Authorization: Bearer $CRON_SECRET`
 * when CRON_SECRET is set; the work is idempotent, so without a secret it simply runs.
 */
export const GET = route(async (req) => {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) throw new HttpError(401, "Unauthorized");
  const expired = await expireSubscriptions();
  await cleanupAuthRows();
  logger.info("cron.daily", { expired });
  return { ok: true, expired };
});
