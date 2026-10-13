import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

/** Deployment diagnostics: is the database configured, reachable and migrated? Exposes no secrets. */
export async function GET() {
  const checks = { databaseUrl: Boolean(process.env.DATABASE_URL), reachable: false, migrated: false, ai: Boolean(process.env.ANTHROPIC_API_KEY) };
  let hint: string | undefined;
  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.reachable = true;
    await prisma.user.count();
    checks.migrated = true;
  } catch (err) {
    if (!checks.databaseUrl) hint = "DATABASE_URL is not set.";
    else if (!checks.reachable) hint = "Cannot connect to the database (wrong host, credentials, or it is localhost).";
    else if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2021") hint = "Tables are missing: run `prisma migrate deploy`.";
    else hint = "Database error; see server logs.";
  }
  const ok = checks.reachable && checks.migrated;
  return NextResponse.json({ ok, checks, hint }, { status: ok ? 200 : 503 });
}
