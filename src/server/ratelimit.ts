import "server-only";
import { prisma } from "@/lib/db";
import { HttpError } from "@/lib/http";

/**
 * Fixed-window limiter stored in Postgres, so every serverless instance shares
 * the same counters. One atomic upsert per call.
 */
export async function rateLimit(key: string, max: number, windowMs: number) {
  const now = new Date();
  const reset = new Date(now.getTime() + windowMs);
  const rows = await prisma.$queryRaw<{ count: number }[]>`
    INSERT INTO "RateLimit" ("key", "count", "resetAt") VALUES (${key}, 1, ${reset})
    ON CONFLICT ("key") DO UPDATE SET
      "count"   = CASE WHEN "RateLimit"."resetAt" < ${now} THEN 1 ELSE "RateLimit"."count" + 1 END,
      "resetAt" = CASE WHEN "RateLimit"."resetAt" < ${now} THEN ${reset} ELSE "RateLimit"."resetAt" END
    RETURNING "count"`;
  if ((rows[0]?.count ?? 0) > max) throw new HttpError(429, "Too many attempts. Please wait a moment and try again.");
}

export function clientIp(req: Request) {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "local";
}
