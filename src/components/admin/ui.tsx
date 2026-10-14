import Link from "next/link";

export const fmtDate = (d: Date | null | undefined) => (d ? new Intl.DateTimeFormat("uk-UA", { day: "2-digit", month: "2-digit", year: "numeric" }).format(d) : "—");
export const fmtDateTime = (d: Date | null | undefined) => (d ? new Intl.DateTimeFormat("uk-UA", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(d) : "—");
export const fmtMoney = (minor: number, currency = "UAH") => `${new Intl.NumberFormat("uk-UA", { maximumFractionDigits: 0 }).format(minor / 100)} ${currency === "UAH" ? "₴" : currency}`;
export const fmtNum = (n: number) => new Intl.NumberFormat("uk-UA").format(n);

export const PLAN_LABEL: Record<string, string> = { FREE: "Безкоштовний", PRO: "Pro", TEAMS: "Команди" };
export const STATUS: Record<string, [string, string]> = {
  TRIALING: ["Пробна", "bg-[var(--accent-soft)] text-[var(--accent)]"],
  ACTIVE: ["Активна", "bg-[var(--success-soft)] text-[var(--success)]"],
  PAST_DUE: ["Борг", "bg-[var(--warning-soft)] text-[var(--warning)]"],
  CANCELED: ["Скасовано", "bg-[var(--surface-3)] text-[var(--muted)]"],
  EXPIRED: ["Завершено", "bg-[var(--surface-3)] text-[var(--muted)]"],
};

export function Badge({ className = "", children }: { className?: string; children: React.ReactNode }) {
  return <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[12px] font-semibold ${className}`}>{children}</span>;
}

export function PlanBadge({ plan }: { plan: string }) {
  const cls = plan === "FREE" ? "bg-[var(--surface-3)] text-[var(--muted)]" : plan === "PRO" ? "bg-[var(--accent)] text-white" : "bg-[var(--text)] text-[var(--surface)]";
  return <Badge className={cls}>{PLAN_LABEL[plan] ?? plan}</Badge>;
}

export function Card({ title, aside, children, className = "" }: { title?: React.ReactNode; aside?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={`rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 ${className}`}>
      {title && <div className="mb-4 flex items-baseline justify-between gap-3"><h2 className="text-[15px] font-semibold">{title}</h2>{aside && <div className="text-[13px] text-[var(--muted)]">{aside}</div>}</div>}
      {children}
    </section>
  );
}

export function Kpi({ label, value, sub, tone }: { label: string; value: React.ReactNode; sub?: React.ReactNode; tone?: "good" | "bad" }) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
      <p className="text-[13px] font-medium text-[var(--muted)]">{label}</p>
      <p className="mt-1.5 text-[26px] font-semibold tabular-nums leading-tight" style={{ fontFamily: "var(--font-heading, inherit)" }}>{value}</p>
      {sub && <p className={`mt-1 text-[12.5px] font-semibold ${tone === "bad" ? "text-[var(--danger)]" : tone === "good" ? "text-[var(--success)]" : "text-[var(--muted)]"}`}>{sub}</p>}
    </div>
  );
}

/** Simple bar chart; the last bar is highlighted. */
export function Bars({ data, format = String }: { data: { label: string; value: number }[]; format?: (n: number) => string }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div>
      <div className="flex h-40 items-end gap-1.5" role="img" aria-label={data.map((d) => `${d.label}: ${format(d.value)}`).join(", ")}>
        {data.map((d, i) => (
          <div key={d.label + i} className="group relative flex h-full flex-1 flex-col justify-end">
            <div className={`rounded-md ${i === data.length - 1 ? "bg-[var(--accent)]" : "bg-[var(--accent-soft)] group-hover:bg-[var(--accent)]/50"}`} style={{ height: `${Math.max(2, (d.value / max) * 100)}%` }} />
            <span className="pointer-events-none absolute -top-6 left-1/2 hidden -translate-x-1/2 whitespace-nowrap rounded bg-[var(--text)] px-1.5 py-0.5 text-[11px] text-[var(--surface)] group-hover:block">{format(d.value)}</span>
          </div>
        ))}
      </div>
      <div className="mt-2 flex gap-1.5 text-[11px] text-[var(--muted)]">
        {data.map((d, i) => <span key={d.label + i} className="flex-1 truncate text-center">{d.label}</span>)}
      </div>
    </div>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <p className="rounded-xl border border-dashed border-[var(--border-strong)] px-4 py-8 text-center text-[14px] text-[var(--muted)]">{children}</p>;
}

export function Pager({ page, pages, href }: { page: number; pages: number; href: (p: number) => string }) {
  if (pages <= 1) return null;
  return (
    <div className="mt-4 flex items-center justify-end gap-2 text-[13px]">
      {page > 1 && <Link className="rounded-lg border border-[var(--border)] px-3 py-1.5 hover:bg-[var(--surface-2)]" href={href(page - 1)}>← Назад</Link>}
      <span className="text-[var(--muted)]">Сторінка {page} з {pages}</span>
      {page < pages && <Link className="rounded-lg border border-[var(--border)] px-3 py-1.5 hover:bg-[var(--surface-2)]" href={href(page + 1)}>Далі →</Link>}
    </div>
  );
}
