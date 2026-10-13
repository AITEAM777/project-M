import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { AuthChrome } from "@/components/auth/auth-chrome";

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  if (await getCurrentUser()) redirect("/dashboard");
  return <AuthChrome>{children}</AuthChrome>;
}
