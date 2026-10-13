import { Suspense } from "react";
import { AuthForm } from "@/components/auth/auth-form";

export const metadata = { title: "Create account" };

export default function RegisterPage() {
  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight">Create your Nodera</h1>
      <p className="mt-1 mb-7 text-sm text-muted">A private space for your thoughts, goals and plans.</p>
      <Suspense><AuthForm mode="register" /></Suspense>
    </>
  );
}
