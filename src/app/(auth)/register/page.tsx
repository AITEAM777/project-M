import { Suspense } from "react";
import { AuthPage } from "@/components/auth/auth-chrome";

export const metadata = { title: "Create account · Реєстрація" };

export default function RegisterPage() {
  return <Suspense><AuthPage mode="register" /></Suspense>;
}
