import "server-only";
import { logger } from "@/lib/logger";

/**
 * How one-time codes reach people:
 * - "resend": RESEND_API_KEY is set — real email via resend.com.
 * - "log":    AUTH_DEV_CODES=1 outside Vercel production — the code is logged and shown
 *             on screen. For local development and end-to-end tests only.
 * - "off":    neither — email codes are disabled and sign-up works without them.
 */
export type MailMode = "resend" | "log" | "off";

export function mailMode(): MailMode {
  if (process.env.RESEND_API_KEY) return "resend";
  if (process.env.AUTH_DEV_CODES === "1" && process.env.VERCEL_ENV !== "production") return "log";
  return "off";
}

const FROM = () => process.env.MAIL_FROM || "Nodera <hello@noderamind.com>";

export async function sendMail(to: string, subject: string, html: string, text: string) {
  const mode = mailMode();
  if (mode === "log") {
    logger.info("mail.dev", { to, subject, text });
    return;
  }
  if (mode === "off") throw new Error("Email is not configured");
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: FROM(), to, subject, html, text }),
  });
  if (!res.ok) {
    logger.error("mail.failed", { status: res.status, body: (await res.text()).slice(0, 300) });
    throw new Error("Email could not be sent");
  }
}

const COPY = {
  signup: {
    en: ["Your Nodera sign-up code", "Confirm your email", "Enter this code to finish creating your Nodera account."],
    uk: ["Код для реєстрації в Nodera", "Підтвердіть пошту", "Введіть цей код, щоб завершити створення акаунта Nodera."],
  },
  reset: {
    en: ["Your Nodera password reset code", "Reset your password", "Enter this code to set a new password."],
    uk: ["Код для зміни пароля Nodera", "Зміна пароля", "Введіть цей код, щоб встановити новий пароль."],
  },
  admin: {
    en: ["Nodera admin sign-in code", "Admin sign-in", "Someone is signing in to the Nodera admin panel with your account."],
    uk: ["Код входу в адмін-панель Nodera", "Вхід в адмін-панель", "Хтось входить в адмін-панель Nodera з вашим акаунтом."],
  },
} as const;

export function codeEmail(purpose: keyof typeof COPY, code: string, locale: string) {
  const l = locale === "uk" ? "uk" : "en";
  const [subject, title, lead] = COPY[purpose][l];
  const valid = l === "uk" ? "Код дійсний 10 хвилин." : "The code is valid for 10 minutes.";
  const ignore = l === "uk" ? "Якщо це були не ви, просто проігноруйте цей лист." : "If this wasn't you, you can ignore this email.";
  const html = `<!doctype html><html><body style="margin:0;background:#F6F5FB;font-family:Arial,Helvetica,sans-serif;color:#1B1830">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:40px 16px">
<table role="presentation" width="100%" style="max-width:480px;background:#ffffff;border-radius:20px;padding:36px" cellpadding="0" cellspacing="0"><tr><td>
<p style="margin:0 0 24px;font-weight:700;font-size:18px;color:#5B4FE0">Nodera</p>
<h1 style="margin:0 0 10px;font-size:22px">${title}</h1>
<p style="margin:0 0 24px;font-size:15px;line-height:1.5;color:#5E5A73">${lead}</p>
<p style="margin:0 0 24px;font-size:34px;font-weight:700;letter-spacing:8px;background:#F1EFFA;border-radius:14px;padding:18px;text-align:center">${code}</p>
<p style="margin:0 0 6px;font-size:13px;color:#8A86A0">${valid}</p>
<p style="margin:0;font-size:13px;color:#8A86A0">${ignore}</p>
</td></tr></table></td></tr></table></body></html>`;
  const text = `${title}\n\n${lead}\n\n${code}\n\n${valid}\n${ignore}`;
  return { subject: `${subject}: ${code}`, html, text };
}
