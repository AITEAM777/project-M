import "server-only";
import { createHash, randomInt, timingSafeEqual } from "crypto";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { HttpError } from "@/lib/http";
import { codeEmail, mailMode, sendMail } from "./mail";

export type CodePurpose = "signup" | "reset" | "admin";

const TTL_MS = 10 * 60_000;
const MAX_ATTEMPTS = 5;
const RESEND_COOLDOWN_MS = 60_000;

export function hashCode(email: string, purpose: string, code: string) {
  return createHash("sha256").update(`${purpose}:${email.toLowerCase()}:${code}`).digest("hex");
}

export function newCode() {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

/**
 * Replaces any pending code for this email+purpose and emails a fresh one.
 * Returns the code itself only in "log" mail mode (local development / tests).
 */
export async function issueCode(email: string, purpose: CodePurpose, opts: { locale?: string; payload?: Prisma.InputJsonValue } = {}) {
  const last = await prisma.emailCode.findFirst({ where: { email, purpose, consumedAt: null }, orderBy: { createdAt: "desc" } });
  if (last && Date.now() - last.createdAt.getTime() < RESEND_COOLDOWN_MS) {
    throw new HttpError(429, "Please wait a minute before requesting a new code.");
  }
  const code = newCode();
  await prisma.$transaction([
    prisma.emailCode.deleteMany({ where: { email, purpose, consumedAt: null } }),
    prisma.emailCode.create({
      data: { email, purpose, codeHash: hashCode(email, purpose, code), payload: opts.payload, expiresAt: new Date(Date.now() + TTL_MS) },
    }),
  ]);
  const mail = codeEmail(purpose, code, opts.locale ?? "en");
  try {
    await sendMail(email, mail.subject, mail.html, mail.text);
  } catch {
    throw new HttpError(502, "We couldn't send the email. Please try again in a minute.");
  }
  return mailMode() === "log" ? code : undefined;
}

/** Checks a code; burns it on success, counts the attempt on failure. Returns the stored row. */
export async function consumeCode(email: string, purpose: CodePurpose, code: string) {
  const row = await prisma.emailCode.findFirst({ where: { email, purpose, consumedAt: null }, orderBy: { createdAt: "desc" } });
  if (!row || row.expiresAt < new Date()) throw new HttpError(400, "The code has expired. Request a new one.");
  if (row.attempts >= MAX_ATTEMPTS) throw new HttpError(400, "Too many wrong codes. Request a new one.");
  const a = Buffer.from(row.codeHash, "hex");
  const b = Buffer.from(hashCode(email, purpose, code.replace(/\D/g, "")), "hex");
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    await prisma.emailCode.update({ where: { id: row.id }, data: { attempts: { increment: 1 } } });
    throw new HttpError(400, "Wrong code. Check the email and try again.");
  }
  // Conditional update so two parallel requests can't both use the same code.
  const { count } = await prisma.emailCode.updateMany({ where: { id: row.id, consumedAt: null }, data: { consumedAt: new Date() } });
  if (count !== 1) throw new HttpError(400, "The code has expired. Request a new one.");
  return row;
}

export async function latestPayload(email: string, purpose: CodePurpose) {
  const row = await prisma.emailCode.findFirst({ where: { email, purpose, consumedAt: null }, orderBy: { createdAt: "desc" } });
  return row?.payload ?? null;
}
