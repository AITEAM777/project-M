import { Suspense } from "react";
import { AuthPage } from "@/components/auth/auth-chrome";

export const metadata = { title: "Sign in · Вхід" };

export default function LoginPage() {
  return <Suspense><AuthPage mode="login" /></Suspense>;
}
