"use client";
import { getLocale, tr } from "@/lib/i18n";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { api } from "@/lib/client/api";
import { useWorkspace } from "@/lib/client/store";

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const router = useRouter();
  const params = useSearchParams();
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await api(`/api/auth/${mode}`, { method: "POST", json: mode === "login" ? { email: form.email, password: form.password } : { ...form, locale: getLocale() }, ws: null });
      useWorkspace.setState({ id: null }); // pick the user's workspace fresh
      const next = params.get("next");
      router.replace(next && next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      {mode === "register" && (
        <Field label={tr("Name")}>
          <Input autoComplete="name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder={tr("Alex")} autoFocus />
        </Field>
      )}
      <Field label={tr("Email")}>
        <Input type="email" autoComplete="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="you@example.com" autoFocus={mode === "login"} />
      </Field>
      <Field label={tr("Password")} hint={mode === "register" ? tr("At least 8 characters") : undefined}>
        <Input type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} required minLength={8} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="••••••••" />
      </Field>
      {error && <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">{error}</p>}
      <Button type="submit" variant="primary" size="lg" className="w-full justify-center" loading={loading}>
        {mode === "login" ? tr("Sign in") : tr("Create account")}
      </Button>
      <p className="text-center text-sm text-muted">
        {mode === "login" ? (
          <>{tr("New to Nodera?")}{" "}<Link className="font-medium text-accent hover:underline" href="/register">{tr("Create an account")}</Link></>
        ) : (
          <>{tr("Already have an account?")}{" "}<Link className="font-medium text-accent hover:underline" href="/login">{tr("Sign in")}</Link></>
        )}
      </p>
    </form>
  );
}
