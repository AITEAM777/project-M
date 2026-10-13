import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import { Landing } from "@/components/landing/landing";

export const metadata: Metadata = {
  title: { absolute: "Nodera — ваш другий мозок" },
  description: "Записуйте ідеї, бачте, як сфери життя впливають одна на одну, і рухайтесь до цілей з вимірюваним прогресом.",
};

export default async function Home() {
  const user = await getCurrentUser().catch(() => null);
  return <Landing signedIn={!!user} />;
}
