"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { tr } from "@/lib/i18n";
import { useCelebrate } from "@/lib/client/celebrate";
import { ProgressRing } from "./progress-ring";

/** Small dark card that shows how much a completed task moved its goal. */
export function GoalPulse() {
  const { pulse, hidePulse } = useCelebrate();
  const router = useRouter();
  const [shown, setShown] = useState(0);
  useEffect(() => {
    if (!pulse) return;
    setShown(pulse.before);
    const a = setTimeout(() => setShown(pulse.after), 120);
    const b = setTimeout(hidePulse, 4500);
    return () => { clearTimeout(a); clearTimeout(b); };
  }, [pulse, hidePulse]);
  if (!pulse) return null;
  return (
    <button key={pulse.key} onClick={() => { hidePulse(); router.push(`/goals/${pulse.id}`); }} role="status"
      className="fixed bottom-6 left-1/2 z-[60] flex -translate-x-1/2 items-center gap-3 rounded-2xl bg-[#18181b] py-2.5 pl-2.5 pr-4 text-left text-white shadow-pop animate-pulse-in dark:bg-[#ededf0] dark:text-[#18181b]">
      <ProgressRing value={shown} size={40} stroke={4} color="#8b8bf5" track="rgba(140,140,160,.35)" />
      <span>
        <span className="block text-sm font-semibold">{tr("+{n}% to goal “{title}”", { n: pulse.after - pulse.before, title: pulse.title })}</span>
        <span className="block text-xs opacity-70">{pulse.before}% → {pulse.after}%</span>
      </span>
    </button>
  );
}
