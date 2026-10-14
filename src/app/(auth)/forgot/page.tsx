import { Suspense } from "react";
import { redirect } from "next/navigation";
import { AuthPage } from "@/components/auth/auth-chrome";
import { mailMode } from "@/server/mail";

export const metadata = { title: "Reset password · Відновлення пароля" };
export const dynamic = "force-dynamic";

export default function ForgotPage() {
  if (mailMode() === "off") redirect("/login");
  return <Suspense><AuthPage mode="forgot" /></Suspense>;
}
