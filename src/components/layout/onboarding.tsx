"use client";
import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { CheckSquare, Goal, Lightbulb, PlayCircle, Workflow } from "lucide-react";
import { patch, post } from "@/lib/client/api";
import { useMe } from "@/lib/client/hooks";
import { toast } from "@/lib/client/store";
import { getLocale, tr } from "@/lib/i18n";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useTour } from "@/components/tour/tour-store";
import { LanguageSwitcher } from "./language-switcher";

const IDEAS = [
  { icon: Lightbulb, title: "Capture thoughts", body: "Press Q anywhere to save an idea in seconds." },
  { icon: Workflow, title: "Connect ideas visually", body: "Mind maps show how your goals and ideas influence each other." },
  { icon: CheckSquare, title: "Turn ideas into action", body: "Any card on a map can become a task, goal, project or habit." },
  { icon: Goal, title: "Track real progress", body: "Goals calculate progress from milestones and completed tasks." },
];

/** First-run welcome: offers the guided tour right after registration. */
export function Onboarding() {
  const { data, mutate } = useMe();
  const router = useRouter();
  const pathname = usePathname();
  const startTour = useTour((s) => s.start);
  const [busy, setBusy] = useState<string | null>(null);
  if (!data || data.user.onboardedAt) return null;

  const done = async (then: "tour" | "map" | "skip") => {
    setBusy(then);
    try {
      await patch("/api/me", { onboarded: true });
      if (then === "map") {
        const { map } = await post<{ map: { id: string } }>("/api/maps", { template: "personal-development", locale: getLocale() });
        router.push(`/maps/${map.id}`);
      }
      await mutate();
      if (then === "tour") {
        if (pathname !== "/dashboard") router.push("/dashboard");
        setTimeout(() => startTour("dashboard"), pathname === "/dashboard" ? 150 : 900);
      }
    } catch (e) { toast.error(e); } finally { setBusy(null); }
  };

  return (
    <Dialog open onClose={() => done("skip")} size="md">
      <div className="pt-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium text-accent">{tr("Welcome to Nodera")}</p>
            <h2 className="mt-1 text-xl font-semibold tracking-tight">{tr("Let's show you around")}</h2>
          </div>
          <LanguageSwitcher />
        </div>
        <p className="mt-2 text-sm leading-relaxed text-muted">{tr("Nodera turns scattered thoughts into connected plans and measurable progress. A short guided tour shows where everything is.")}</p>
        <ul className="mt-5 grid gap-3 sm:grid-cols-2">
          {IDEAS.map((i) => (
            <li key={i.title} className="flex gap-3 rounded-xl border border-border p-3">
              <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-accent-soft text-accent"><i.icon className="size-4" /></span>
              <span>
                <span className="block text-sm font-medium">{tr(i.title)}</span>
                <span className="block text-xs leading-snug text-muted">{tr(i.body)}</span>
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-4 rounded-xl bg-amber-300/15 px-3 py-2.5 text-sm text-text-2">💡 {tr("Later, the lightbulb in the bottom-right corner of every page starts a tour of that page.")}</p>
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="ghost" onClick={() => done("skip")} loading={busy === "skip"}>{tr("Skip")}</Button>
          <Button variant="secondary" onClick={() => done("map")} loading={busy === "map"}>{tr("Open an example map")}</Button>
          <Button variant="primary" onClick={() => done("tour")} loading={busy === "tour"} autoFocus><PlayCircle className="size-4" /> {tr("Start the guided tour")}</Button>
        </div>
      </div>
    </Dialog>
  );
}
