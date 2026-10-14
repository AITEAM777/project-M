"use client";
import { tr } from "@/lib/i18n";
import { useEffect, useId, useRef, useState } from "react";
import { api } from "@/lib/client/api";
import { Arrow } from "@/components/landing/ui";

export const authInputCls =
  "auth-input h-12 w-full rounded-xl border border-[var(--border)] bg-white px-4 text-[15.5px] text-[var(--text)] outline-none transition-[border-color,box-shadow] placeholder:text-[#A3A6AF] hover:border-[#D6D0C4] focus:border-[var(--brand)] focus:shadow-[0_0_0_4px_rgba(95,86,176,.14)] focus-visible:outline-none";

export function FormError({ error }: { error: string | null }) {
  if (!error) return null;
  return <p role="alert" className="rounded-xl border border-[#F2D6CC] bg-[#FBEEE9] px-4 py-3 text-[14px] text-[#A1462A]">{tr(error)}</p>;
}

export function SubmitButton({ loading, children }: { loading: boolean; children: React.ReactNode }) {
  return (
    <button type="submit" disabled={loading} className="l-btn l-btn-primary !h-12 w-full justify-between !pl-6 disabled:opacity-70">
      <span>{children}</span>
      <span className="l-btn-arrow">
        {loading ? <span className="size-4 animate-spin rounded-full border-2 border-white/40 border-t-white" aria-hidden /> : <Arrow />}
      </span>
    </button>
  );
}

/**
 * "We emailed you a code": one numeric field (works with iOS/Android one-time-code autofill),
 * auto-submits at 6 digits, resend with a 60-second cooldown.
 */
export function CodeStep({ email, purpose, devCode, onBack, onSubmit, extra, submitLabel }: {
  email: string;
  purpose: "signup" | "reset";
  devCode?: string;
  onBack: () => void;
  onSubmit: (code: string) => Promise<void>;
  extra?: React.ReactNode;
  submitLabel: string;
}) {
  const id = useId();
  const [code, setCode] = useState("");
  const [dev, setDev] = useState(devCode);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [wait, setWait] = useState(60);
  const busy = useRef(false);

  useEffect(() => {
    if (wait <= 0) return;
    const t = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(t);
  }, [wait]);

  async function submit(value = code) {
    if (busy.current) return;
    busy.current = true;
    setError(null);
    setLoading(true);
    try {
      await onSubmit(value);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setLoading(false);
    } finally {
      busy.current = false;
    }
  }

  async function resend() {
    setError(null);
    setInfo(null);
    try {
      const r = await api<{ devCode?: string }>("/api/auth/resend", { method: "POST", json: { email, purpose }, ws: null });
      setDev(r.devCode);
      setCode("");
      setWait(60);
      setInfo(tr("A new code is on its way."));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    }
  }

  return (
    <form onSubmit={(e) => { e.preventDefault(); void submit(); }} className="space-y-5" noValidate>
      <p className="text-[15px] leading-relaxed text-[var(--text-muted)]">
        {tr("We sent a 6-digit code to")} <b className="text-[var(--text)]">{email}</b>. {tr("It's valid for 10 minutes.")}
      </p>
      {dev && (
        <p className="rounded-xl border border-dashed border-[var(--brand)] bg-[var(--brand-tint)] px-4 py-3 text-[13.5px] text-[var(--brand)]">
          {tr("Test mode: no email was sent. Your code is")} <b className="tabular-nums tracking-[2px]" data-testid="dev-code">{dev}</b>
        </p>
      )}
      <div>
        <label htmlFor={id} className="mb-1.5 block text-[13.5px] font-medium text-[var(--text-muted)]">{tr("Code from the email")}</label>
        <input id={id} className={`${authInputCls} text-center text-[22px] font-semibold tracking-[10px] tabular-nums`} inputMode="numeric" autoComplete="one-time-code"
          maxLength={6} autoFocus required value={code} placeholder="••••••"
          onChange={(e) => {
            const v = e.target.value.replace(/\D/g, "").slice(0, 6);
            setCode(v);
            if (v.length === 6 && !extra) void submit(v);
          }} />
      </div>
      {extra}
      <FormError error={error} />
      {info && !error && <p role="status" className="text-[13.5px] text-[#3E7C63]">{info}</p>}
      <SubmitButton loading={loading}>{submitLabel}</SubmitButton>
      <div className="flex items-center justify-between text-[14px]">
        <button type="button" onClick={onBack} className="font-medium text-[var(--text-muted)] hover:text-[var(--text)]">← {tr("Change email")}</button>
        {wait > 0
          ? <span className="text-[var(--text-soft)] tabular-nums">{tr("Resend in {s} s", { s: wait })}</span>
          : <button type="button" onClick={resend} className="font-semibold text-[var(--brand)] hover:underline">{tr("Send a new code")}</button>}
      </div>
      <p className="text-center text-[12.5px] text-[var(--text-soft)]">{tr("No email? Check the Spam or Promotions folder.")}</p>
    </form>
  );
}
