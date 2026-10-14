import Link from "next/link";
import { prisma } from "@/lib/db";
import { Card, Empty, Pager, fmtDateTime, fmtMoney } from "@/components/admin/ui";

export const metadata = { title: "Платежі" };
const PER_PAGE = 50;

export default async function AdminPayments({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const page = Math.max(1, Number((await searchParams).page) || 1);
  const now = new Date();
  const qStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
  const [count, payments, quarter] = await Promise.all([
    prisma.payment.count(),
    prisma.payment.findMany({ orderBy: { createdAt: "desc" }, skip: (page - 1) * PER_PAGE, take: PER_PAGE, include: { user: { select: { id: true, email: true } } } }),
    prisma.payment.aggregate({ where: { status: "paid", createdAt: { gte: qStart } }, _sum: { amount: true, fee: true } }),
  ]);
  const qGross = quarter._sum.amount ?? 0;
  const qNum = Math.floor(now.getMonth() / 3) + 1;
  const iso = (d: Date) => d.toISOString().slice(0, 10);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-[24px] font-semibold">Платежі</h1>
        <a href={`/api/admin/export?type=payments&from=${iso(qStart)}`} className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3.5 py-2 text-[13.5px] font-semibold hover:bg-[var(--surface-2)]">⬇ Експорт за {qNum} квартал (для декларації)</a>
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[[`Дохід за ${qNum} кв.`, fmtMoney(qGross)], ["Комісії платіжки", fmtMoney(quarter._sum.fee ?? 0)], ["Єдиний податок 5%", fmtMoney(Math.round(qGross * 0.05))], ["Військовий збір 1%", fmtMoney(Math.round(qGross * 0.01))]].map(([k, v]) => (
          <div key={k} className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4"><p className="text-[12.5px] text-[var(--muted)]">{k}</p><p className="mt-1 text-[20px] font-semibold tabular-nums">{v}</p></div>
        ))}
      </div>
      <p className="text-[12.5px] text-[var(--muted)]">Податки — орієнтовний розрахунок для ФОП 3-ї групи без ПДВ. ЄСВ сплачується окремо фіксованою сумою. Звіряйте з бухгалтером.</p>
      <Card>
        {payments.length === 0 ? <Empty>Платежів ще немає. Вони з’являться тут автоматично після підключення платіжного сервісу.</Empty> : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-[14px]">
              <thead><tr className="border-b border-[var(--border)] text-left text-[12px] uppercase tracking-[.05em] text-[var(--muted)]">
                <th className="py-2 pr-3 font-semibold">Дата</th><th className="py-2 pr-3 font-semibold">Клієнт</th><th className="py-2 pr-3 font-semibold">Тариф</th><th className="py-2 pr-3 font-semibold">Сума</th><th className="py-2 pr-3 font-semibold">Комісія</th><th className="py-2 font-semibold">Статус</th>
              </tr></thead>
              <tbody>
                {payments.map((p) => (
                  <tr key={p.id} className="border-b border-[var(--border)] last:border-0">
                    <td className="py-2.5 pr-3 tabular-nums">{fmtDateTime(p.createdAt)}</td>
                    <td className="py-2.5 pr-3">{p.user ? <Link className="hover:underline" href={`/users/${p.user.id}`}>{p.user.email}</Link> : "—"}</td>
                    <td className="py-2.5 pr-3">{p.plan ?? "—"} {p.period ?? ""}</td>
                    <td className="py-2.5 pr-3 tabular-nums">{fmtMoney(p.amount, p.currency)}</td>
                    <td className="py-2.5 pr-3 tabular-nums text-[var(--muted)]">{fmtMoney(p.fee, p.currency)}</td>
                    <td className="py-2.5">{p.status === "paid" ? "✅ оплачено" : p.status === "refunded" ? "↩️ повернено" : "⚠️ не пройшов"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Pager page={page} pages={Math.ceil(count / PER_PAGE)} href={(p) => `/payments?page=${p}`} />
      </Card>
    </div>
  );
}
