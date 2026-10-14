import { Suspense } from "react";
import { AuthPage } from "@/components/auth/auth-chrome";
import { mailMode } from "@/server/mail";

export const metadata = { title: "Sign in · Вхід" };
export const dynamic = "force-dynamic";

export default function LoginPage() {
  return <Suspense><AuthPage mode="login" resetEnabled={mailMode() !== "off"} /></Suspense>;
}
