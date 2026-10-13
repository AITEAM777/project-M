import "server-only";
import { HttpError } from "@/lib/http";

/**
 * In-memory fixed-window limiter. Good enough for a single instance;
 * replace with Redis/Upstash when running multiple replicas.
 */
const buckets = new Map<string, { count: number; reset: number }>();

export function rateLimit(key: string, max: number, windowMs: number) {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || b.reset < now) {
    buckets.set(key, { count: 1, reset: now + windowMs });
    return;
  }
  b.count++;
  if (b.count > max) throw new HttpError(429, "Too many attempts. Please wait a moment and try again.");
}

export function clientIp(req: Request) {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "local";
}
