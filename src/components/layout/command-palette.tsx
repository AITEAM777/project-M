"use client";
import { getLocale, tr } from "@/lib/i18n";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { CalendarDays, CheckSquare, FileText, Folder, FolderTree, Goal, LayoutDashboard, Lightbulb, Network, Repeat, Search, Settings, Workflow, CircleDot, Zap, Plus, History } from "lucide-react";
import { invalidate, post, useApi } from "@/lib/client/api";
import { quickParse, type QuickKind } from "@/lib/nlp/quick-parse";
import { QUICK_EXAMPLES, QuickCreateCard, applyRemoved, quickPayload, type ChipKey } from "./quick-create";
import { useDebouncedValue } from "@/lib/client/hooks";
import { toast, useUI } from "@/lib/client/store";
import { cn } from "@/lib/utils";
import { Kbd, Spinner } from "@/components/ui/misc";

type Result = { type: string; id: string; title: string; snippet?: string; href: string; meta?: string };

const ICON: Record<string, React.ElementType> = { note: FileText, thought: Lightbulb, node: CircleDot, task: CheckSquare, goal: Goal, project: FolderTree, map: Workflow, habit: Repeat, folder: Folder };
const TYPES = ["all", "note", "thought", "node", "task", "goal", "project", "map", "habit"] as const;

export function CommandPalette() {
  const { paletteOpen, setPalette, setCapture, openCreate, openTask } = useUI();
  const router = useRouter();
  const [q, setQ] = useState("");
  const [type, setType] = useState<(typeof TYPES)[number]>("all");
  const [idx, setIdx] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const dq = useDebouncedValue(q, 180);
  const tagMode = dq.startsWith("#");
  const path = paletteOpen && dq.trim().length > (tagMode ? 1 : 0)
    ? `/api/search?${tagMode ? `tag=${encodeURIComponent(dq.slice(1))}` : `q=${encodeURIComponent(dq)}`}${type !== "all" ? `&types=${type}` : ""}`
    : null;
  const { data, isLoading } = useApi<{ results: Result[] }>(path, { keepPreviousData: true });

  /* ---- natural-language quick create ---- */
  const { data: goalData } = useApi<{ goals: { id: string; title: string; status: string }[] }>(paletteOpen ? "/api/goals" : null);
  const activeGoals = useMemo(() => (goalData?.goals ?? []).filter((g) => g.status !== "COMPLETED" && g.status !== "ABANDONED"), [goalData]);
  const [kindOverride, setKindOverride] = useState<QuickKind | null>(null);
  const [removed, setRemoved] = useState<Set<ChipKey>>(new Set());
  const [creating, setCreating] = useState(false);
  useEffect(() => { setRemoved(new Set()); }, [q]);
  const parsed = useMemo(() => {
    const p = quickParse(q, { goals: activeGoals });
    return applyRemoved(kindOverride ? { ...p, kind: kindOverride } : p, removed);
  }, [q, activeGoals, kindOverride, removed]);
  const showQuick = !tagMode && q.trim().length >= 3 && !!parsed.title && (parsed.signals > 0 || !!kindOverride);

  const commands = useMemo(() => {
    const nav = [
      { title: tr("Dashboard"), href: "/dashboard", icon: LayoutDashboard }, { title: tr("My Thoughts"), href: "/thoughts", icon: Lightbulb },
      { title: tr("Notes"), href: "/notes", icon: FileText }, { title: tr("Mind Maps"), href: "/maps", icon: Workflow }, { title: tr("Projects"), href: "/projects", icon: FolderTree },
      { title: tr("Tasks"), href: "/tasks", icon: CheckSquare }, { title: tr("Goals"), href: "/goals", icon: Goal }, { title: tr("Calendar"), href: "/calendar", icon: CalendarDays },
      { title: tr("Habits"), href: "/habits", icon: Repeat }, { title: tr("Knowledge Graph"), href: "/graph", icon: Network }, { title: tr("Timeline of ideas"), href: "/timeline", icon: History }, { title: tr("Settings"), href: "/settings", icon: Settings },
    ].map((n) => ({ ...n, run: () => router.push(n.href), group: tr("Go to") }));
    const actions = [
      { title: tr("Capture a thought"), icon: Zap, run: () => setCapture(true) },
      { title: tr("New note"), icon: Plus, run: () => openCreate("note") },
      { title: tr("New mind map"), icon: Plus, run: () => openCreate("map") },
      { title: tr("New task"), icon: Plus, run: () => openCreate("task") },
      { title: tr("New goal"), icon: Plus, run: () => openCreate("goal") },
      { title: tr("New project"), icon: Plus, run: () => openCreate("project") },
      { title: tr("New habit"), icon: Plus, run: () => openCreate("habit") },
    ].map((a) => ({ ...a, href: "", group: tr("Create") }));
    const all = [...actions, ...nav];
    return q ? all.filter((c) => c.title.toLowerCase().includes(q.toLowerCase())) : all;
  }, [q, router, setCapture, openCreate]);

  const items = [
    ...(data && path ? data.results : []).map((r) => ({ key: `${r.type}:${r.id}`, title: r.title, sub: r.snippet, meta: r.meta ?? tr(r.type), icon: ICON[r.type] ?? Search, run: () => router.push(r.href), group: tr("Results") })),
    ...commands.map((c) => ({ key: c.title, title: c.title, sub: undefined as string | undefined, meta: c.group === "Go to" ? "" : "", icon: c.icon, run: c.run, group: c.group })),
  ];

  useEffect(() => { if (paletteOpen) { setQ(""); setIdx(0); setKindOverride(null); setTimeout(() => input.current?.focus(), 10); } }, [paletteOpen]);
  useEffect(() => setIdx(showQuick ? -1 : 0), [dq, type, showQuick]);
  if (!paletteOpen || typeof document === "undefined") return null;
  const close = () => setPalette(false);
  const run = (i: number) => { const it = items[i]; if (it) { close(); it.run(); } };
  const create = async () => {
    if (creating || !parsed.title) return;
    setCreating(true);
    try {
      const { path: p, body } = quickPayload(parsed);
      const res = await post<{ task?: { id: string }; goal?: { id: string }; habit?: { id: string }; note?: { id: string } }>(p, body);
      invalidate("/api/tasks", "/api/goals", "/api/habits", "/api/notes", "/api/dashboard", "/api/events");
      close();
      const open = res.task ? () => openTask(res.task!.id) : res.goal ? () => router.push(`/goals/${res.goal!.id}`) : res.habit ? () => router.push("/habits") : res.note ? () => router.push(parsed.kind === "note" ? `/notes/${res.note!.id}` : "/thoughts") : undefined;
      const what = { task: tr("Task created"), goal: tr("Goal created"), habit: tr("Habit created"), note: tr("Note created"), thought: tr("Thought saved") }[parsed.kind];
      toast.success(`${what}: ${parsed.title}`, open ? { label: tr("Open"), run: open } : undefined);
    } catch (e) { toast.error(e); } finally { setCreating(false); }
  };

  let lastGroup = "";
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-start justify-center p-3 pt-[10vh]">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] animate-fade-in" onClick={close} />
      <div role="dialog" aria-label={tr("Search and commands")} className="relative w-full max-w-2xl rounded-2xl border border-border bg-surface shadow-pop animate-pop-in overflow-hidden"
        onKeyDown={(e) => {
          if (e.key === "Escape") close();
          if (e.key === "ArrowDown") { e.preventDefault(); setIdx((i) => Math.min(items.length - 1, i + 1)); }
          if (e.key === "ArrowUp") { e.preventDefault(); setIdx((i) => Math.max(showQuick ? -1 : 0, i - 1)); }
          if (e.key === "Enter") { e.preventDefault(); if (showQuick && idx === -1) void create(); else run(idx); }
        }}>
        <div className="flex items-center gap-3 border-b border-border px-4">
          <Search className="size-5 text-muted" />
          <input ref={input} value={q} onChange={(e) => setQ(e.target.value)} placeholder={tr("Search, or just type: tomorrow at 9 run 5 km")} className="h-14 flex-1 bg-transparent text-[15px] outline-none placeholder:text-muted" aria-label={tr("Search")} />
          {isLoading && path && <Spinner className="size-4" />}
        </div>
        {showQuick && (
          <QuickCreateCard parsed={parsed} active={idx === -1} onCreate={() => void create()}
            onKind={(k) => setKindOverride(k)} onRemove={(k) => setRemoved((r) => new Set(r).add(k))} />
        )}
        {!q && (
          <div className="border-b border-border px-2 py-2">
            <p className="px-3 pt-1 pb-1 text-[11px] font-medium uppercase tracking-wide text-muted">{tr("Create by typing — try")}</p>
            {QUICK_EXAMPLES.map((ex) => (
              <button key={ex.hint} onClick={() => { setQ(ex.text[getLocale()]); input.current?.focus(); }} className="flex w-full items-center gap-3 rounded-lg px-3 py-1.5 text-left hover:bg-surface-2">
                <span className="grid size-6 place-items-center rounded-md bg-surface-2 text-xs">{ex.icon}</span>
                <span className="min-w-0 flex-1 truncate text-[13px]">«{ex.text[getLocale()]}»</span>
                <span className="whitespace-nowrap text-[11px] text-muted">{tr(ex.hint)}</span>
              </button>
            ))}
          </div>
        )}
        <div className="flex gap-1 overflow-x-auto border-b border-border px-3 py-2">
          {TYPES.map((t) => (
            <button key={t} onClick={() => setType(t)} className={cn("rounded-md px-2 py-1 text-xs font-medium capitalize whitespace-nowrap", type === t ? "bg-accent-soft text-accent" : "text-muted hover:bg-surface-2")}>{tr(t === "all" ? "All" : `${t}s`)}</button>
          ))}
        </div>
        <ul className="max-h-[55vh] overflow-y-auto p-2" role="listbox">
          {path && data && !data.results.length && !isLoading && !showQuick && <li className="px-3 py-6 text-center text-sm text-muted">{tr("No results for “{q}”.", { q: dq })}</li>}
          {items.map((it, i) => {
            const header = it.group !== lastGroup ? it.group : null;
            lastGroup = it.group;
            const Icon = it.icon;
            return (
              <li key={it.key}>
                {header && <p className="px-3 pt-2 pb-1 text-[11px] font-medium uppercase tracking-wide text-muted">{header}</p>}
                <button role="option" aria-selected={i === idx} onMouseMove={() => setIdx(i)} onClick={() => run(i)}
                  className={cn("w-full flex items-start gap-3 rounded-lg px-3 py-2 text-left", i === idx && "bg-surface-2")}>
                  <Icon className="mt-0.5 size-4 text-muted shrink-0" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm">{it.title}</span>
                    {it.sub && <span className="block truncate text-xs text-muted">{it.sub}</span>}
                  </span>
                  {it.meta && <span className="text-[11px] text-muted capitalize whitespace-nowrap">{it.meta}</span>}
                </button>
              </li>
            );
          })}
        </ul>
        <div className="flex items-center gap-3 border-t border-border px-4 py-2 text-[11px] text-muted">
          <span><Kbd>↑</Kbd> <Kbd>↓</Kbd> navigate</span><span><Kbd>↵</Kbd> open</span><span><Kbd>esc</Kbd> close</span>
        </div>
      </div>
    </div>,
    document.body,
  );
}
