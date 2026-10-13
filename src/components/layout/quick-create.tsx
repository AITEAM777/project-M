"use client";
import { useMemo } from "react";
import { Sparkles, X } from "lucide-react";
import { getLocale, tr } from "@/lib/i18n";
import { useApi } from "@/lib/client/api";
import { fmt, minutes, relDay } from "@/lib/client/format";
import { expandRecurring, type Recurrence as SchedRecurrence } from "@/lib/schedule";
import { blockOf, type Parsed, type QuickKind } from "@/lib/nlp/quick-parse";
import type { CalEvent } from "@/lib/client/types";
import { cn } from "@/lib/utils";
import { Kbd } from "@/components/ui/misc";

export type ChipKey = "date" | "time" | "duration" | "recurrence" | "goal" | "priority" | "tags" | "reminder";

const KINDS: { id: QuickKind; label: string; icon: string }[] = [
  { id: "task", label: "Task", icon: "☑" }, { id: "goal", label: "Goal", icon: "🎯" }, { id: "habit", label: "Habit", icon: "🔁" }, { id: "thought", label: "Thought", icon: "💡" }, { id: "note", label: "Note", icon: "📝" },
];

const REC: Record<string, string> = { DAILY: "Every day", WEEKDAYS: "On weekdays", WEEKLY: "Every week", MONTHLY: "Every month" };
const hhmm = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;

/** Removes chips the user dismissed. */
export function applyRemoved(p: Parsed, removed: Set<ChipKey>): Parsed {
  return {
    ...p,
    date: removed.has("date") ? null : p.date,
    time: removed.has("time") || removed.has("date") ? null : p.time,
    endTime: removed.has("time") || removed.has("date") ? null : p.endTime,
    duration: removed.has("duration") ? null : p.duration,
    recurrence: removed.has("recurrence") ? null : p.recurrence,
    goal: removed.has("goal") ? null : p.goal,
    priority: removed.has("priority") ? null : p.priority,
    tags: removed.has("tags") ? [] : p.tags,
    reminder: removed.has("reminder") ? null : p.reminder,
  };
}

/** Builds the API request for a parsed phrase. */
export function quickPayload(p: Parsed): { path: string; body: Record<string, unknown> } {
  const block = blockOf(p);
  const due = p.date ? new Date(p.date.getFullYear(), p.date.getMonth(), p.date.getDate(), 12).toISOString() : undefined;
  switch (p.kind) {
    case "goal": return { path: "/api/goals", body: { title: p.title, targetDate: due, priority: p.priority ?? undefined } };
    case "habit": return { path: "/api/habits", body: { title: p.title, frequency: p.recurrence === "WEEKLY" ? "WEEKLY" : "DAILY", reminderTime: p.reminder ?? undefined } };
    case "note": return { path: "/api/notes", body: { kind: "NOTE", text: p.title } };
    case "thought": return { path: "/api/notes", body: { kind: "THOUGHT", text: p.title } };
    default: return {
      path: "/api/tasks",
      body: {
        title: p.title, dueDate: due, scheduledStart: block?.start.toISOString(), scheduledEnd: block?.end.toISOString(),
        estimateMinutes: block ? Math.round((block.end.getTime() - block.start.getTime()) / 60000) : p.duration ?? undefined,
        recurrence: p.recurrence ?? undefined, goalId: p.goal?.id, priority: p.priority ?? undefined, tags: p.tags.length ? p.tags : undefined,
      },
    };
  }
}

function useConflict(p: Parsed) {
  const block = p.kind === "task" ? blockOf(p) : null;
  const day = block ? new Date(block.start.getFullYear(), block.start.getMonth(), block.start.getDate()) : null;
  const next = day ? new Date(day.getTime() + 86_400_000) : null;
  const { data } = useApi<{ events: CalEvent[]; tasks: { id: string; title: string; status: string; scheduledStart: string | null; scheduledEnd: string | null }[] }>(
    day && next ? `/api/events?from=${day.toISOString()}&to=${next.toISOString()}` : null,
  );
  return useMemo(() => {
    if (!block || !data || !day || !next) return null;
    const blocks = [
      ...expandRecurring(data.events.filter((e) => !e.allDay).map((e) => ({ id: e.id, title: e.title, start: new Date(e.start), end: new Date(e.end), recurrence: (e.recurrence || "NONE") as SchedRecurrence, recurUntil: e.recurUntil ? new Date(e.recurUntil) : null })), day, next),
      ...data.tasks.filter((t) => t.scheduledStart && t.scheduledEnd && t.status !== "DONE").map((t) => ({ id: t.id, title: t.title, start: new Date(t.scheduledStart!), end: new Date(t.scheduledEnd!) })),
    ];
    return { clash: blocks.find((b) => b.start < block.end && b.end > block.start) ?? null };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, block?.start.getTime(), block?.end.getTime()]);
}

/** "Nodera understood it like this" card shown in the command palette. */
export function QuickCreateCard({ parsed, active, onKind, onRemove, onCreate }: {
  parsed: Parsed; active: boolean; onKind: (k: QuickKind) => void; onRemove: (k: ChipKey) => void; onCreate: () => void;
}) {
  const conflict = useConflict(parsed);
  const block = blockOf(parsed);
  const chips: { key: ChipKey; icon: string; label: string; value: string }[] = [];
  if (parsed.date) chips.push({ key: "date", icon: "📅", label: parsed.kind === "goal" ? tr("Target") : tr("When"), value: `${relDay(parsed.date)}${Math.abs(parsed.date.getTime() - Date.now()) > 2 * 86_400_000 ? "" : `, ${fmt(parsed.date, getLocale() === "uk" ? "EEEEEE d MMM" : "EEE d MMM")}`}` });
  if (block) chips.push({ key: "time", icon: "⏰", label: tr("Time"), value: `${fmt(block.start, "HH:mm")}–${fmt(block.end, "HH:mm")}` });
  else if (parsed.duration) chips.push({ key: "duration", icon: "⏱", label: tr("Duration"), value: minutes(parsed.duration) });
  if (parsed.recurrence) chips.push({ key: "recurrence", icon: "🔁", label: tr("Repeat"), value: parsed.recurrence === "WEEKLY" && parsed.date && parsed.kind === "task" ? tr("Every week on {day}", { day: fmt(parsed.date, "EEEE") }) : tr(REC[parsed.recurrence]) });
  if (parsed.goal) chips.push({ key: "goal", icon: "🎯", label: tr("Goal"), value: parsed.goal.title });
  if (parsed.reminder) chips.push({ key: "reminder", icon: "🔔", label: tr("Reminder"), value: parsed.reminder });
  if (parsed.priority) chips.push({ key: "priority", icon: parsed.priority === "URGENT" ? "🔥" : "❗", label: tr("Priority"), value: parsed.priority === "URGENT" ? tr("Urgent") : tr("High") });
  if (parsed.tags.length) chips.push({ key: "tags", icon: "🏷", label: tr("Tags"), value: parsed.tags.map((t) => `#${t}`).join(" ") });
  const supported = (k: ChipKey) => parsed.kind === "task" || (parsed.kind === "goal" && ["date", "priority"].includes(k)) || (parsed.kind === "habit" && ["recurrence", "reminder"].includes(k));
  const shown = chips.filter((c) => supported(c.key));

  return (
    <div className="border-b border-border bg-surface-2/50 px-4 py-3.5">
      <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.08em] text-muted"><Sparkles className="size-3.5 text-accent" />{tr("Nodera understood it like this")}</p>
      <div role="option" aria-selected={active} onClick={onCreate}
        className={cn("mt-2.5 cursor-pointer rounded-2xl border bg-surface p-3.5 transition-shadow", active ? "border-accent shadow-[0_0_0_4px_var(--ring)]" : "border-border hover:border-border-strong")}>
        <div className="flex items-start gap-2.5">
          <span className="mt-0.5 text-base leading-none">{KINDS.find((k) => k.id === parsed.kind)?.icon}</span>
          <p className="min-w-0 flex-1 text-[15px] font-semibold leading-snug">{parsed.title || <span className="text-muted">{tr("Untitled")}</span>}</p>
        </div>
        <div className="mt-2.5 flex flex-wrap gap-1" onClick={(e) => e.stopPropagation()}>
          {KINDS.map((k) => (
            <button key={k.id} onClick={() => onKind(k.id)} className={cn("rounded-full px-2 py-0.5 text-[11.5px] font-medium", parsed.kind === k.id ? "bg-accent-soft text-accent" : "text-muted hover:bg-surface-2")}>
              {k.icon} {tr(k.label)}
            </button>
          ))}
        </div>
        {!!shown.length && (
          <div className="mt-2.5 flex flex-wrap gap-1.5" onClick={(e) => e.stopPropagation()}>
            {shown.map((c) => (
              <span key={c.key} className="group/chip inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface py-1 pl-2.5 pr-1 text-[12.5px]">
                <span className="text-muted">{c.icon} {c.label}</span><b className="font-semibold">{c.value}</b>
                <button onClick={() => onRemove(c.key)} className="rounded p-0.5 text-muted hover:bg-surface-2 hover:text-text" aria-label={tr("Remove {what}", { what: c.label })}><X className="size-3" /></button>
              </span>
            ))}
          </div>
        )}
        {block && conflict && (
          conflict.clash
            ? <p className="mt-2.5 text-[12px] font-medium text-warning">⚠ {tr("Overlaps with “{title}” ({time})", { title: conflict.clash.title, time: `${fmt(conflict.clash.start, "HH:mm")}–${fmt(conflict.clash.end, "HH:mm")}` })}</p>
            : <p className="mt-2.5 text-[12px] font-medium text-success">✓ {tr("Free in your calendar at {time} · no conflicts", { time: hhmm(parsed.time ?? 0) })}</p>
        )}
      </div>
      <div className="mt-2 flex items-center justify-between gap-3 text-[11.5px] text-muted">
        <span>{tr("Click × to drop a detail, or switch the type")}</span>
        <span className="flex items-center gap-1 whitespace-nowrap"><Kbd>↵</Kbd> {tr("create")}</span>
      </div>
    </div>
  );
}

export const QUICK_EXAMPLES: { icon: string; text: { en: string; uk: string }; hint: string }[] = [
  { icon: "☑", text: { en: "tomorrow at 9 run 5 km, for goal marathon, weekly", uk: "завтра о 9 пробіжка 5 км, до цілі марафон, щотижня" }, hint: "task" },
  { icon: "🎯", text: { en: "new goal learn English to B2 by June", uk: "нова ціль вивчити англійську до B2 до червня" }, hint: "goal + deadline" },
  { icon: "🔁", text: { en: "habit: water 2 l daily, remind at 12", uk: "звичка: вода 2 л щодня, нагадати о 12" }, hint: "habit" },
  { icon: "📅", text: { en: "friday from 18:30 to 20 dinner with friends #family", uk: "в п'ятницю з 18:30 до 20 вечеря з друзями #сім'я" }, hint: "time block" },
];
