"use client";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { Download, Share2, X } from "lucide-react";
import { tp, tr } from "@/lib/i18n";
import { fmt } from "@/lib/client/format";
import { api, invalidate } from "@/lib/client/api";
import { useCelebrate } from "@/lib/client/celebrate";
import { useUI } from "@/lib/client/store";
import { Button } from "@/components/ui/button";

interface Story {
  id: string; title: string; startedAt: string; fromMap: boolean; days: number; tasksDone: number;
  milestones: { done: number; total: number }; bestStreak: number;
}

const COLORS = ["#5b5bd6", "#f59e0b", "#12a150", "#ec4899", "#0ea5e9", "#8b5cf6"];

function Confetti() {
  const bits = useMemo(() => Array.from({ length: 90 }, (_, i) => ({
    left: Math.random() * 100, delay: Math.random() * 0.6, dur: 2.2 + Math.random() * 1.6, size: 6 + Math.random() * 6,
    color: COLORS[i % COLORS.length], rot: Math.random() * 360, drift: (Math.random() - 0.5) * 160, round: Math.random() > 0.6,
  })), []);
  return (
    <div className="pointer-events-none fixed inset-0 z-[95] overflow-hidden motion-reduce:hidden" aria-hidden>
      {bits.map((b, i) => (
        <span key={i} className="confetti-bit absolute -top-4 block" style={{
          left: `${b.left}%`, width: b.size, height: b.round ? b.size : b.size * 0.45, background: b.color, borderRadius: b.round ? 99 : 2,
          animationDelay: `${b.delay}s`, animationDuration: `${b.dur}s`, ["--drift" as string]: `${b.drift}px`, ["--rot" as string]: `${b.rot + 540}deg`,
        }} />
      ))}
    </div>
  );
}

/** Draws a shareable 1080×1350 card of the achievement. */
async function renderCard(s: Story, stats: { value: string; label: string }[]) {
  await document.fonts.ready;
  const W = 1080, H = 1350;
  const c = document.createElement("canvas");
  c.width = W; c.height = H;
  const g = c.getContext("2d")!;
  const bg = g.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, "#1b1b3a"); bg.addColorStop(1, "#0b0b14");
  g.fillStyle = bg; g.fillRect(0, 0, W, H);
  for (let i = 0; i < 160; i++) { g.fillStyle = `rgba(255,255,255,${Math.random() * 0.6})`; g.beginPath(); g.arc(Math.random() * W, Math.random() * H, Math.random() * 1.8, 0, 7); g.fill(); }
  const display = '"Unbounded Variable", Unbounded, sans-serif', text = '"Manrope Variable", Manrope, sans-serif';
  g.fillStyle = "#a5a5ff"; g.font = `700 30px ${text}`; g.fillText(tr("GOAL ACHIEVED").split("").join(String.fromCharCode(8202)), 90, 190);
  g.fillStyle = "#fff"; g.font = `600 76px ${display}`;
  const words = s.title.split(" "); let line = "", y = 300;
  for (const w of words) { const t = line ? `${line} ${w}` : w; if (g.measureText(t).width > W - 180) { g.fillText(line, 90, y); y += 92; line = w; } else line = t; }
  g.fillText(line, 90, y);
  y += 120;
  stats.forEach((st, i) => {
    const x = 90 + (i % 2) * 460, yy = y + Math.floor(i / 2) * 230;
    g.fillStyle = "rgba(255,255,255,0.07)"; g.beginPath(); g.roundRect(x, yy, 430, 200, 32); g.fill();
    g.fillStyle = "#fff"; g.font = `600 72px ${display}`; g.fillText(st.value, x + 40, yy + 105);
    g.fillStyle = "#b4b4c4"; g.font = `500 32px ${text}`; g.fillText(st.label, x + 40, yy + 160);
  });
  g.fillStyle = "#fff"; g.font = `600 40px ${display}`; g.fillText("Nodera", 90, H - 90);
  g.fillStyle = "#8b8b96"; g.font = `500 28px ${text}`; g.fillText(tr("from an idea to a result"), 330, H - 92);
  return new Promise<Blob>((res) => c.toBlob((b) => res(b!), "image/png"));
}

/** Full-screen celebration when a goal is achieved. */
export function Celebration() {
  const { goalId, close } = useCelebrate();
  const { openCreate } = useUI();
  const router = useRouter();
  const [story, setStory] = useState<Story | null>(null);
  useEffect(() => {
    setStory(null);
    if (!goalId) return;
    api<{ story: Story }>(`/api/goals/${goalId}/story`).then((r) => setStory(r.story)).catch(() => close());
    invalidate("/api/goals", "/api/dashboard");
  }, [goalId, close]);
  useEffect(() => {
    if (!goalId) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [goalId, close]);
  if (!goalId || !story || typeof document === "undefined") return null;

  const stats = [
    { value: String(story.days), label: tp(story.days, "day", "days") },
    { value: String(story.tasksDone), label: tp(story.tasksDone, "task done", "tasks done") },
    { value: story.milestones.total ? `${story.milestones.done}/${story.milestones.total}` : "—", label: tr("milestones") },
    { value: story.bestStreak ? `🔥${story.bestStreak}` : "—", label: tr("best streak") },
  ];
  const path = [
    { t: `${story.fromMap ? "💡 " + tr("Idea") : "🎯 " + tr("Goal set")} · ${fmt(story.startedAt, "d MMM")}`, cls: "bg-amber-400/15" },
    ...(story.milestones.total ? [{ t: `🏁 ${tr("{n} milestones", { n: story.milestones.total })}`, cls: "bg-accent-soft" }] : []),
    { t: `✅ ${tr("{n} tasks", { n: story.tasksDone })}`, cls: "bg-accent-soft" },
    { t: `🏆 ${fmt(new Date(), "d MMM")}`, cls: "bg-success-soft" },
  ];
  const share = async () => {
    const blob = await renderCard(story, stats);
    const file = new File([blob], "nodera-goal.png", { type: "image/png" });
    if (navigator.canShare?.({ files: [file] })) { try { await navigator.share({ files: [file], title: story.title }); return; } catch { /* cancelled */ } }
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "nodera-goal.png"; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  };

  return createPortal(
    <>
      <Confetti />
      <div className="fixed inset-0 z-[90] grid place-items-center p-4">
        <div className="absolute inset-0 bg-black/45 backdrop-blur-[2px] animate-fade-in" onClick={close} />
        <div role="dialog" aria-modal="true" aria-label={tr("Goal achieved")} className="relative w-full max-w-[560px] rounded-[26px] bg-surface p-7 text-center shadow-pop animate-celebrate-in sm:p-8">
          <button onClick={close} className="absolute right-4 top-4 rounded-lg p-1.5 text-muted hover:bg-surface-2" aria-label={tr("Close")}><X className="size-4" /></button>
          <div className="mx-auto grid size-20 place-items-center rounded-full bg-gradient-to-br from-[#8b8bf5] to-[#5b5bd6] text-4xl shadow-[0_0_0_10px_var(--accent-soft)] animate-medal">🏅</div>
          <p className="mt-5 text-xs font-bold tracking-[0.12em] text-accent">{tr("GOAL ACHIEVED")}</p>
          <h2 className="mt-1.5 text-2xl leading-tight">{story.title}</h2>
          <p className="mt-1.5 text-sm text-muted">{tr("From the first idea to the finish line — here is your path:")}</p>
          <div className="mt-5 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            {stats.map((s) => (
              <div key={s.label} className="rounded-2xl bg-surface-2 px-2 py-3">
                <p className="font-[family-name:var(--font-display)] text-xl font-semibold">{s.value}</p>
                <p className="mt-0.5 text-[11.5px] text-muted">{s.label}</p>
              </div>
            ))}
          </div>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-1.5 text-[12.5px] font-semibold">
            {path.map((p, i) => (
              <span key={i} className="flex items-center gap-1.5">{i > 0 && <span className="text-border-strong">—</span>}<span className={`rounded-full px-2.5 py-1 ${p.cls}`}>{p.t}</span></span>
            ))}
          </div>
          <div className="mt-6 flex flex-col-reverse justify-center gap-2 sm:flex-row">
            <Button variant="secondary" onClick={share}>{"share" in navigator ? <Share2 className="size-4" /> : <Download className="size-4" />}{tr("Share as image")}</Button>
            <Button variant="primary" onClick={() => { close(); router.push("/goals"); openCreate("goal"); }}>{tr("Set a new goal")} →</Button>
          </div>
        </div>
      </div>
    </>,
    document.body,
  );
}
