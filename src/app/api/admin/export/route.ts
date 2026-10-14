import { prisma } from "@/lib/db";
import { route } from "@/lib/http";
import { clientIp } from "@/server/ratelimit";
import { adminLog } from "@/server/admin";
import { requireAdmin } from "@/server/admin-api";

const cell = (v: unknown) => {
  const s = v instanceof Date ? v.toISOString() : v == null ? "" : String(v);
  // Quote everything; neutralise spreadsheet formulas.
  return `"${(/^[=+\-@]/.test(s) ? `'${s}` : s).replace(/"/g, '""')}"`;
};
const csv = (rows: unknown[][]) => "﻿" + rows.map((r) => r.map(cell).join(",")).join("\r\n");

/** CSV for the accountant: payments (default) or users. */
export const GET = route(async (req) => {
  const admin = await requireAdmin();
  const url = new URL(req.url);
  const type = url.searchParams.get("type") === "users" ? "users" : "payments";
  let body: string;
  if (type === "users") {
    const users = await prisma.user.findMany({ orderBy: { createdAt: "asc" }, select: { name: true, email: true, plan: true, locale: true, emailVerifiedAt: true, createdAt: true } });
    body = csv([["Ім'я", "Email", "Тариф", "Мова", "Пошту підтверджено", "Зареєстровано"], ...users.map((u) => [u.name, u.email, u.plan, u.locale, u.emailVerifiedAt, u.createdAt])]);
  } else {
    const from = url.searchParams.get("from");
    const to = url.searchParams.get("to");
    const payments = await prisma.payment.findMany({
      where: { createdAt: { gte: from ? new Date(from) : undefined, lt: to ? new Date(to) : undefined } },
      orderBy: { createdAt: "asc" },
      include: { user: { select: { email: true } } },
    });
    body = csv([["Дата", "Email", "Сума", "Комісія", "Валюта", "Статус", "Тариф", "Період", "Платіжка", "ID платежу"],
      ...payments.map((p) => [p.createdAt, p.user?.email, (p.amount / 100).toFixed(2), (p.fee / 100).toFixed(2), p.currency, p.status, p.plan, p.period, p.provider, p.providerRef])]);
  }
  await adminLog(admin.email, "export", { target: type, ip: clientIp(req) });
  return new Response(body, {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="nodera-${type}-${new Date().toISOString().slice(0, 10)}.csv"` },
  });
});
