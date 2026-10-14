"use client";
import { getLocale, tr } from "@/lib/i18n";
import Link from "next/link";
import { useState } from "react";
import { api } from "@/lib/client/api";
import { authInputCls, CodeStep, FormError, SubmitButton } from "./code-step";
import { TextField, useFinishAuth } from "./auth-form";

/** Forgot password: email → 6-digit code + new password → signed in. */
export function ForgotForm({ onCodeStep }: { onCodeStep?: (on: boolean) => void }) {
  const finish = useFinishAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState<{ email: string; devCode?: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (pending) {
    return (
      <CodeStep email={pending.email} purpose="reset" devCode={pending.devCode} submitLabel={tr("Save new password")}
        onBack={() => { setPending(null); onCodeStep?.(false); }}
        extra={
          <TextField label={tr("New password")}>
            {(id) => <input id={id} className={authInputCls} type="password" autoComplete="new-password" required minLength={8}
              value={password} onChange={(e) => setPassword(e.target.value)} placeholder={tr("At least 8 characters")} />}
          </TextField>
        }
        onSubmit={async (code) => {
          await api("/api/auth/reset", { method: "POST", json: { email: pending.email, code, password }, ws: null });
          finish();
        }} />
    );
  }

  return (
    <form className="space-y-5" noValidate onSubmit={async (e) => {
      e.preventDefault();
      setError(null);
      setLoading(true);
      try {
        const r = await api<{ email: string; devCode?: string }>("/api/auth/forgot", { method: "POST", json: { email, locale: getLocale() }, ws: null });
        setPending({ email: r.email, devCode: r.devCode });
        onCodeStep?.(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong");
      }
      setLoading(false);
    }}>
      <TextField label={tr("Email")}>
        {(id) => <input id={id} className={authInputCls} type="email" inputMode="email" autoComplete="email" required autoFocus
          value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />}
      </TextField>
      <FormError error={error} />
      <SubmitButton loading={loading}>{tr("Send code")}</SubmitButton>
      <p className="pt-1 text-center text-[14.5px] text-[var(--text-muted)]">
        {tr("Remembered it?")}{" "}<Link className="font-semibold text-[var(--brand)] hover:underline" href="/login">{tr("Sign in")}</Link>
      </p>
    </form>
  );
}
