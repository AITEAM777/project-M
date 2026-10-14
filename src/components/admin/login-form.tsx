"use client";
import { useState } from "react";
import { api } from "@/lib/client/api";

const input = "h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3.5 text-[15px] outline-none focus:border-[var(--accent)] focus:shadow-[0_0_0_3px_var(--ring)]";

export function AdminLoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<{ devCode?: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function run(fn: () => Promise<void>) {
    setError(null);
    setLoading(true);
    try {
      await fn();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Помилка");
      setLoading(false);
    }
  }
  const done = () => { window.location.href = "/"; };

  return (
    <form className="space-y-4" noValidate onSubmit={(e) => {
      e.preventDefault();
      if (!step) {
        void run(async () => {
          const r = await api<{ needsCode?: boolean; devCode?: string }>("/api/admin/login", { method: "POST", json: { email, password }, ws: null });
          if (r.needsCode) { setStep({ devCode: r.devCode }); setLoading(false); } else done();
        });
      } else {
        void run(async () => { await api("/api/admin/verify", { method: "POST", json: { email, code }, ws: null }); done(); });
      }
    }}>
      {!step ? (
        <>
          <label className="block text-[13px] font-medium text-[var(--muted)]">Пошта
            <input className={`${input} mt-1.5`} type="email" autoComplete="username" autoFocus required value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>
          <label className="block text-[13px] font-medium text-[var(--muted)]">Пароль
            <input className={`${input} mt-1.5`} type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
          </label>
        </>
      ) : (
        <>
          <p className="text-[14px] text-[var(--text-2)]">Ми надіслали код на <b>{email}</b>.</p>
          {step.devCode && <p className="rounded-xl border border-dashed border-[var(--accent)] bg-[var(--accent-soft)] px-3 py-2 text-[13px] text-[var(--accent)]">Тестовий режим, код: <b data-testid="dev-code">{step.devCode}</b></p>}
          <label className="block text-[13px] font-medium text-[var(--muted)]">Код з листа
            <input className={`${input} mt-1.5 text-center text-[20px] tracking-[8px] tabular-nums`} inputMode="numeric" autoComplete="one-time-code" maxLength={6} autoFocus required
              value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))} />
          </label>
        </>
      )}
      {error && <p role="alert" className="rounded-xl bg-[var(--danger-soft)] px-3.5 py-2.5 text-[14px] text-[var(--danger)]">{error}</p>}
      <button type="submit" disabled={loading} className="h-11 w-full rounded-xl bg-[var(--accent)] text-[15px] font-semibold text-white hover:bg-[var(--accent-hover)] disabled:opacity-60">
        {loading ? "…" : step ? "Підтвердити" : "Увійти"}
      </button>
    </form>
  );
}
