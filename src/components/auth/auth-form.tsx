"use client";
import { getLocale, tr } from "@/lib/i18n";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useId, useState } from "react";
import { api } from "@/lib/client/api";
import { useWorkspace } from "@/lib/client/store";
import { authInputCls as inputCls, CodeStep, FormError, SubmitButton } from "./code-step";

export function TextField({ label, hint, aside, children }: { label: string; hint?: React.ReactNode; aside?: React.ReactNode; children: (id: string) => React.ReactNode }) {
  const id = useId();
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="block text-[13.5px] font-medium text-[var(--text-muted)]">{label}</label>
        {aside}
      </div>
      {children(id)}
      {hint}
    </div>
  );
}

/** 0–4: length, mixed case, digits, symbols. */
export function strength(p: string) {
  if (!p) return 0;
  let s = p.length >= 8 ? 1 : 0;
  if (p.length >= 12) s++;
  if (/[a-zа-яіїєґ]/.test(p) && /[A-ZА-ЯІЇЄҐ]/.test(p)) s++;
  if (/\d/.test(p) && /[^\p{L}\d]/u.test(p)) s++;
  return Math.min(4, s);
}

export function useFinishAuth() {
  const router = useRouter();
  const params = useSearchParams();
  return () => {
    useWorkspace.setState({ id: null }); // pick the user's workspace fresh
    const next = params.get("next");
    router.replace(next && next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard");
    router.refresh();
  };
}

export function AuthForm({ mode, resetEnabled, onCodeStep }: { mode: "login" | "register"; resetEnabled?: boolean; onCodeStep?: (on: boolean) => void }) {
  const finish = useFinishAuth();
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [pending, setPending] = useState<{ email: string; devCode?: string } | null>(null);
  const [show, setShow] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const s = strength(form.password);
  const sLabel = [tr("At least 8 characters"), tr("Weak"), tr("Okay"), tr("Good"), tr("Strong")][s];
  const sColor = ["#D6D0C4", "#BF6E4E", "#B5873A", "#4F9277", "#3E7C63"][s];

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const r = await api<{ needsCode?: boolean; email?: string; devCode?: string }>(`/api/auth/${mode}`, { method: "POST", json: mode === "login" ? { email: form.email, password: form.password } : { ...form, locale: getLocale() }, ws: null });
      if (r.needsCode && r.email) {
        setPending({ email: r.email, devCode: r.devCode });
        onCodeStep?.(true);
        setLoading(false);
        return;
      }
      finish();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setLoading(false);
    }
  }

  if (pending) {
    return (
      <CodeStep email={pending.email} purpose="signup" devCode={pending.devCode} submitLabel={tr("Confirm and create account")}
        onBack={() => { setPending(null); onCodeStep?.(false); }}
        onSubmit={async (code) => {
          await api("/api/auth/verify", { method: "POST", json: { email: pending.email, code }, ws: null });
          finish();
        }} />
    );
  }

  return (
    <form onSubmit={submit} className="space-y-5" noValidate>
      {mode === "register" && (
        <TextField label={tr("Name")}>
          {(id) => <input id={id} className={inputCls} autoComplete="name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder={tr("Alex")} autoFocus />}
        </TextField>
      )}
      <TextField label={tr("Email")}>
        {(id) => <input id={id} className={inputCls} type="email" inputMode="email" autoComplete="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="you@example.com" autoFocus={mode === "login"} />}
      </TextField>
      <TextField
        label={tr("Password")}
        aside={mode === "login" && resetEnabled && <Link href="/forgot" className="text-[13px] font-semibold text-[var(--brand)] hover:underline">{tr("Forgot password?")}</Link>}
        hint={mode === "register" && (
          <div className="mt-2.5 flex items-center gap-3" aria-live="polite">
            <div className="flex flex-1 gap-1" aria-hidden>
              {[1, 2, 3, 4].map((i) => <span key={i} className="h-1 flex-1 rounded-full transition-colors duration-300" style={{ background: i <= s ? sColor : "#ECE8E0" }} />)}
            </div>
            <span className="min-w-[120px] text-right text-[12.5px] text-[var(--text-soft)]">{sLabel}</span>
          </div>
        )}
      >
        {(id) => (
          <div className="relative">
            <input id={id} className={`${inputCls} pr-12`} type={show ? "text" : "password"} autoComplete={mode === "login" ? "current-password" : "new-password"} required minLength={8} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="••••••••" />
            <button type="button" onClick={() => setShow(!show)} aria-pressed={show} aria-label={tr("Show what you typed")} title={tr("Show what you typed")}
              className="absolute right-1.5 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-lg text-[var(--text-soft)] hover:bg-[var(--surface-2)] hover:text-[var(--text)]">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" /><circle cx="12" cy="12" r="3" />
                {show && <path d="M4 4l16 16" />}
              </svg>
            </button>
          </div>
        )}
      </TextField>
      <FormError error={error} />
      <SubmitButton loading={loading}>{mode === "login" ? tr("Sign in") : tr("Create account")}</SubmitButton>
      <p className="pt-1 text-center text-[14.5px] text-[var(--text-muted)]">
        {mode === "login" ? (
          <>{tr("New to Nodera?")}{" "}<Link className="font-semibold text-[var(--brand)] hover:underline" href="/register">{tr("Create an account")}</Link></>
        ) : (
          <>{tr("Already have an account?")}{" "}<Link className="font-semibold text-[var(--brand)] hover:underline" href="/login">{tr("Sign in")}</Link></>
        )}
      </p>
      {mode === "register" && (
        <ul className="flex flex-wrap justify-center gap-x-4 gap-y-1 border-t border-[var(--border)] pt-5 text-[12.5px] text-[var(--text-soft)]">
          <li>✓ {tr("No card needed")}</li><li>✓ {tr("Only you see your data")}</li><li>✓ {tr("Export anytime")}</li>
        </ul>
      )}
    </form>
  );
}
