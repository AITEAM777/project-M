"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckSquare, Goal, Lightbulb, Workflow } from "lucide-react";
import { patch, post } from "@/lib/client/api";
import { useMe } from "@/lib/client/hooks";
import { toast } from "@/lib/client/store";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

const STEPS = [
  { icon: Lightbulb, title: "Capture thoughts", body: "Press Q anywhere to save an idea in seconds. Thoughts land in your inbox until you organize them into folders." },
  { icon: Workflow, title: "Connect ideas visually", body: "Mind maps are infinite canvases. Double-click to add a node, drag between nodes to connect them, and label each connection — supports, leads to, blocks…" },
  { icon: CheckSquare, title: "Turn ideas into action", body: "Any node can become a task, goal, project or habit. It stays on the map and stays in sync — no duplicates." },
  { icon: Goal, title: "Track real progress", body: "Goals calculate progress from milestones and completed tasks. The dashboard shows what's happening today and where you're heading." },
];

export function Onboarding() {
  const { data, mutate } = useMe();
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  if (!data || data.user.onboardedAt) return null;
  const finish = async (withTemplate: boolean) => {
    setBusy(true);
    try {
      await patch("/api/me", { onboarded: true });
      if (withTemplate) {
        const { map } = await post<{ map: { id: string } }>("/api/maps", { template: "personal-development" });
        router.push(`/maps/${map.id}`);
      }
      mutate();
    } catch (e) { toast.error(e); } finally { setBusy(false); }
  };
  const S = STEPS[step];
  return (
    <Dialog open onClose={() => finish(false)} size="md">
      <div className="pt-4 text-center">
        <div className="mx-auto mb-4 grid size-14 place-items-center rounded-2xl bg-accent-soft text-accent"><S.icon className="size-7" /></div>
        <p className="text-xs font-medium text-accent">Welcome to Nodera · {step + 1}/{STEPS.length}</p>
        <h2 className="mt-1 text-xl font-semibold tracking-tight">{S.title}</h2>
        <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-muted">{S.body}</p>
        <div className="mt-5 flex justify-center gap-1.5">{STEPS.map((_, i) => <span key={i} className={`h-1.5 rounded-full transition-all ${i === step ? "w-6 bg-accent" : "w-1.5 bg-surface-3"}`} />)}</div>
        <div className="mt-6 flex flex-col-reverse sm:flex-row justify-center gap-2">
          {step < STEPS.length - 1 ? (
            <>
              <Button variant="ghost" onClick={() => finish(false)}>Skip</Button>
              <Button variant="primary" onClick={() => setStep(step + 1)}>Next</Button>
            </>
          ) : (
            <>
              <Button variant="secondary" onClick={() => finish(false)} loading={busy}>Start empty</Button>
              <Button variant="primary" onClick={() => finish(true)} loading={busy}>Open an example map</Button>
            </>
          )}
        </div>
      </div>
    </Dialog>
  );
}
