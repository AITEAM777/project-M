import { Suspense } from "react";
import { AuthForm } from "@/components/auth/auth-form";

export const metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1>
      <p className="mt-1 mb-7 text-sm text-muted">Sign in to continue to your second brain.</p>
      <Suspense><AuthForm mode="login" /></Suspense>
    </>
  );
}
