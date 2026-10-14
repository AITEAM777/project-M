"use client";
import { tp, tr } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { KIND_META, type MindNode, type NodeKind } from "./types";
import type { pathToGoal } from "./path";

type Path = ReturnType<typeof pathToGoal>;

const ICON = { done: "✅", blocked: "⚠️", open: "○", idea: "·" } as const;

function reasonText(reason: string | undefined) {
  if (reason === "question") return tr("No answer yet — write it in the card's description");
  if (reason === "decision") return tr("Decision not made yet — note it in the description");
  return reason ? tr("Blocked by: {list}", { list: reason }) : "";
}

/** "What blocks my goal?" — the route to a card, its blockers and the next step. */
export function PathOverlay({ goal, path, onExit, onSelect }: { goal: MindNode | undefined; path: Path; onExit: () => void; onSelect: (id: string) => void }) {
  if (!goal) return null;
  const total = path.steps.length;
  const goalDone = path.goal.state === "done";
  return (
    <>
      <div className="pointer-events-none absolute inset-x-0 top-[60px] z-20 flex justify-center px-3">
        <div role="status" className="pointer-events-auto flex max-w-full items-center gap-3 rounded-2xl bg-[#18181b] py-1.5 pl-4 pr-1.5 text-sm text-white shadow-pop animate-pop-in dark:bg-[#ededf0] dark:text-[#18181b]">
          <span aria-hidden>🧭</span>
          <span className="truncate font-semibold">{tr("Path to “{title}”", { title: goal.data.title || tr("Untitled") })}</span>
          <span className="hidden whitespace-nowrap opacity-65 lg:inline">
            {tr("{a} of {b} ready", { a: path.done, b: total })}{path.blocked ? ` · ${tp(path.blocked, "# blocker", "# blockers")}` : ""}
          </span>
          <button onClick={onExit} className="whitespace-nowrap rounded-lg bg-white/10 px-2.5 py-1 text-xs font-medium hover:bg-white/20 dark:bg-black/10 dark:hover:bg-black/20">{tr("Exit")} · Esc</button>
        </div>
      </div>
      <aside className="absolute left-3 top-[116px] z-20 hidden max-h-[calc(100%-140px)] w-[300px] flex-col rounded-2xl border border-border bg-surface shadow-pop animate-pop-in md:flex" aria-label={tr("Path to goal")}>
        <div className="border-b border-border p-4">
          <h3 className="text-[13px]">{tr("What blocks my goal?")}</h3>
          <div className="mt-3 flex gap-1" aria-hidden>
            {path.steps.map((s) => <span key={s.id} className={cn("h-1.5 flex-1 rounded-full", s.state === "done" ? "bg-success" : s.state === "blocked" ? "bg-warning" : "bg-surface-3")} />)}
          </div>
          <p className="mt-2 text-xs text-muted">{total ? tr("{a} of {b} steps ready", { a: path.done, b: total }) : tr("Nothing leads to this card yet. Draw arrows from what has to happen first.")}</p>
        </div>
        {goalDone ? (
          <p className="m-3 rounded-xl bg-success-soft px-3 py-2.5 text-[13px] font-medium text-success">🏆 {tr("This goal is achieved!")}</p>
        ) : path.next ? (
          <button onClick={() => onSelect(path.next!.id)} className="m-3 rounded-xl border border-accent/40 bg-accent-soft px-3 py-2.5 text-left hover:border-accent">
            <span className="block text-[11px] font-semibold uppercase tracking-wide text-accent">{tr("Next step")}</span>
            <span className="mt-0.5 block text-[14px] font-semibold">{path.next.title || tr("Untitled")}</span>
            {path.next.state === "blocked" && <span className="mt-0.5 block text-xs text-muted">{reasonText(path.next.reason)}</span>}
          </button>
        ) : null}
        <ol className="flex-1 overflow-y-auto px-2 pb-3">
          {path.steps.map((s) => (
            <li key={s.id}>
              <button onClick={() => onSelect(s.id)} className="flex w-full items-start gap-2.5 rounded-lg px-2 py-2 text-left hover:bg-surface-2">
                <span className={cn("mt-px w-4 shrink-0 text-center text-[13px]", s.state === "open" && "text-muted", s.state === "idea" && "text-muted")} aria-label={s.state}>{ICON[s.state]}</span>
                <span className="min-w-0 flex-1">
                  <span className={cn("block truncate text-[13px]", s.state === "done" && "text-muted line-through")}>{KIND_META[s.kind as NodeKind]?.icon} {s.title || tr("Untitled")}</span>
                  {s.state === "blocked" && <span className="block text-[11.5px] leading-snug text-warning">{reasonText(s.reason)}</span>}
                </span>
              </button>
            </li>
          ))}
          {path.goal.state === "blocked" && path.goal.blockers.length > 0 && (
            <li className="px-2 pt-1 text-[11.5px] text-warning">⚠️ {tr("The goal itself is blocked by: {list}", { list: path.goal.blockers.map((b) => b.data.title).join(", ") })}</li>
          )}
        </ol>
      </aside>
    </>
  );
}
