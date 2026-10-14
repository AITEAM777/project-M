"use client";
import { tr } from "@/lib/i18n";
import { memo, useEffect, useRef, useState } from "react";
import { Handle, NodeResizer, Position, useStore as useFlowStore, type NodeProps } from "@xyflow/react";
import { ChevronRight, Crosshair, FileText, Paperclip, Plus, Route } from "lucide-react";
import { GoalLive, HabitLive, ProjectLive, TaskLive } from "./live";
import { cn } from "@/lib/utils";
import { useMap, useMapCtx } from "./context";
import { KIND_META, type MindNode } from "./types";

const handleCls = "!size-2.5";

function Handles() {
  return (
    <>
      <Handle id="t" type="source" position={Position.Top} className={handleCls} />
      <Handle id="r" type="source" position={Position.Right} className={handleCls} />
      <Handle id="b" type="source" position={Position.Bottom} className={handleCls} />
      <Handle id="l" type="source" position={Position.Left} className={handleCls} />
    </>
  );
}

function InlineTitle({ id, title }: { id: string; title: string }) {
  const { actions } = useMapCtx();
  const [v, setV] = useState(title);
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    // React Flow keeps new nodes hidden until measured, so focus may need a few frames.
    let tries = 0;
    let raf = 0;
    const tryFocus = () => {
      const el = ref.current;
      if (!el) return;
      el.focus();
      el.select();
      if (document.activeElement !== el && tries++ < 20) raf = requestAnimationFrame(tryFocus);
    };
    tryFocus();
    return () => cancelAnimationFrame(raf);
  }, []);
  return (
    <textarea
      ref={ref}
      value={v}
      rows={Math.min(4, Math.max(1, Math.ceil(v.length / 24)))}
      onChange={(e) => setV(e.target.value)}
      onBlur={() => actions.finishEdit(id, v)}
      onKeyDown={(e) => {
        e.stopPropagation();
        if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); actions.finishEdit(id, v); }
        if (e.key === "Escape") actions.finishEdit(id, null);
      }}
      className="nodrag nowheel w-full resize-none bg-transparent text-[13.5px] font-medium leading-snug outline-none"
      aria-label={tr("Node title")}
    />
  );
}

export const MindNodeView = memo(function MindNodeView({ id, data, selected }: NodeProps<MindNode>) {
  const { actions, readOnly } = useMapCtx();
  const editing = useMap((s) => s.editingId === id);
  const searching = useMap((s) => s.search.length > 0);
  const [pop, setPop] = useState(false);
  const single = useMap((s) => { let k = 0; for (const n of s.nodes) if (n.selected && ++k > 1) return false; return k === 1; });
  const hasChildren = !!data.hasChildren;
  // Level of detail: when zoomed far out, render a lightweight node.
  const far = useFlowStore((s) => s.transform[2] < 0.4);
  const meta = KIND_META[data.kind] ?? KIND_META.THOUGHT;
  const color = data.color || meta.color;
  const icon = data.icon || meta.icon;
  const l = data.linked;
  const task = l?.task;
  const progress = l?.goal?.progress ?? l?.project?.progress;
  const shape = data.shape;
  const isCircle = shape === "circle";
  const isDiamond = shape === "diamond";

  if (far && !editing) {
    return (
      <div className={cn("rounded-lg border bg-[var(--surface)] px-3 py-2", selected ? "border-[var(--accent)] ring-3 ring-[var(--ring)]" : "border-[var(--border)]", searching && !data.match && "opacity-25")} style={{ width: 220, borderLeft: `4px solid ${color}` }}>
        <Handles />
        <p className="truncate text-[15px] font-semibold">{data.title || tr("Untitled")}</p>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "group relative bg-[var(--surface)] text-[var(--text)] border transition-[box-shadow,opacity,border-color] duration-150",
        "shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow)]",
        shape === "pill" && "rounded-full px-4",
        shape === "rectangle" && "rounded-[4px]",
        shape === "rounded" && "rounded-xl",
        isCircle && "rounded-full aspect-square grid place-items-center text-center",
        isDiamond && "rounded-lg",
        selected ? "border-[var(--accent)] ring-3 ring-[var(--ring)]" : "border-[var(--border)]",
        searching && !data.match && "opacity-25",
        task?.status === "DONE" && "opacity-75",
      )}
      style={{ width: isCircle ? 150 : 220, minHeight: isCircle ? 150 : undefined }}
    >
      {!isCircle && <div className={cn("absolute left-0 top-2.5 bottom-2.5 w-[3px] rounded-full", shape === "pill" && "left-2")} style={{ background: color }} />}
      {isDiamond && <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 size-3 rotate-45 border-l border-t border-[var(--border)] bg-[var(--surface)]" />}
      <Handles />
      <div className={cn("px-3.5 py-2.5", isCircle && "px-5")}>
        <div className="flex items-start gap-2">
          {task ? (
            <button
              className={cn("nodrag mt-0.5 grid size-[17px] shrink-0 place-items-center rounded-[5px] border transition-colors", pop && "animate-check", task.status === "DONE" ? "border-[var(--success)] bg-[var(--success)] text-white" : "border-[var(--border-strong)] hover:border-[var(--accent)]")}
              onClick={(e) => { e.stopPropagation(); if (readOnly) return; if (task.status !== "DONE") { setPop(true); navigator.vibrate?.(12); } actions.toggleTask(id); }}
              onAnimationEnd={() => setPop(false)}
              aria-label={task.status === "DONE" ? tr("Mark task as not done") : tr("Mark task as done")}
            >
              {task.status === "DONE" && <svg viewBox="0 0 16 16" className="size-3" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M3.5 8.5l3 3 6-7" /></svg>}
            </button>
          ) : (
            <span className="mt-px text-[15px] leading-none select-none" aria-hidden>{icon}</span>
          )}
          <div className="min-w-0 flex-1">
            {editing ? (
              <InlineTitle id={id} title={data.title} />
            ) : (
              <p className={cn("text-[13.5px] font-medium leading-snug break-words", !data.title && "text-[var(--muted)] italic", task?.status === "DONE" && "line-through")}>
                {data.title || tr("Untitled")}
              </p>
            )}
          </div>
        </div>
        <div className={cn("mt-1.5 flex flex-wrap items-center gap-1.5 text-[10.5px] text-[var(--muted)]", isCircle && "justify-center")}>
          <span className="font-medium uppercase tracking-wide" style={{ color }}>{meta.label}</span>
          {l?.note && <FileText className="size-3" aria-label={tr("Has note")} />}
          {!!data.attachmentCount && <span className="inline-flex items-center gap-0.5"><Paperclip className="size-3" />{data.attachmentCount}</span>}
          {data.tags.slice(0, 2).map((t) => <span key={t}>#{t}</span>)}
        </div>
        {!isCircle && l?.goal && <div className="mt-2"><GoalLive goal={l.goal} color={data.color || "var(--accent)"} /></div>}
        {!isCircle && !l?.goal && l?.project && <div className="mt-2"><ProjectLive project={l.project} color={color} /></div>}
        {!isCircle && l?.habit && <div className="mt-2"><HabitLive habit={l.habit} readOnly={readOnly} onToggleToday={() => actions.toggleHabitToday(id)} /></div>}
        {!isCircle && task && <div className="mt-1.5 empty:hidden"><TaskLive task={task} /></div>}
        {isCircle && progress !== undefined && (
          <div className="mt-2 flex items-center gap-2">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--surface-3)]"><div className="h-full rounded-full" style={{ width: `${progress}%`, background: progress >= 100 ? "var(--success)" : color }} /></div>
            <span className="text-[10.5px] tabular text-[var(--muted)]">{progress}%</span>
          </div>
        )}
      </div>
      {hasChildren && (
        <button
          onClick={(e) => { e.stopPropagation(); actions.toggleCollapse(id); }}
          className={cn("nodrag absolute -right-3 top-1/2 -translate-y-1/2 z-10 grid h-6 min-w-6 place-items-center rounded-full border border-[var(--border)] bg-[var(--surface)] px-1 text-[10px] font-semibold text-[var(--muted)] shadow-sm hover:text-[var(--text)]", !data.collapsed && "opacity-0 group-hover:opacity-100")}
          aria-label={data.collapsed ? tr("Expand branch") : tr("Collapse branch")}
        >
          {data.collapsed ? `+${data.hiddenDescendants ?? ""}` : <ChevronRight className="size-3.5 rotate-180" />}
        </button>
      )}
      {selected && single && !editing && (
        <div className="nodrag absolute -top-3 right-3 z-10 flex gap-1">
          <button onClick={(e) => { e.stopPropagation(); actions.path(id); }} className="flex h-6 items-center gap-1 rounded-full border border-[var(--border)] bg-[var(--surface)] px-2 text-[10.5px] font-semibold text-[var(--text-2)] shadow-sm hover:border-[var(--accent)] hover:text-[var(--accent)]" title={tr("What blocks this? Show the path to this card (P)")}>
            <Route className="size-3" />{tr("Path")}
          </button>
          <button onClick={(e) => { e.stopPropagation(); actions.focus(id); }} className="flex h-6 items-center gap-1 rounded-full border border-[var(--border)] bg-[var(--surface)] px-2 text-[10.5px] font-semibold text-[var(--text-2)] shadow-sm hover:border-[var(--accent)] hover:text-[var(--accent)]" title={tr("Focus on this branch (F)")}>
            <Crosshair className="size-3" />{tr("Focus")}
          </button>
        </div>
      )}
      {selected && !readOnly && !editing && (
        <button onClick={(e) => { e.stopPropagation(); actions.addChild(id); }} className="nodrag absolute -bottom-3 left-1/2 -translate-x-1/2 z-10 grid size-6 place-items-center rounded-full bg-[var(--accent)] text-white shadow-md" aria-label={tr("Add connected node (Tab)")}>
          <Plus className="size-3.5" />
        </button>
      )}
    </div>
  );
});

export const GroupNodeView = memo(function GroupNodeView({ id, data, selected }: NodeProps<MindNode>) {
  const editing = useMap((s) => s.editingId === id);
  const color = data.color || "#64748b";
  return (
    <div className="h-full w-full rounded-2xl border-2 border-dashed" style={{ borderColor: `${color}66`, background: `${color}0d` }}>
      <NodeResizer isVisible={selected} minWidth={200} minHeight={120} lineClassName="!border-[var(--accent)]" handleClassName="!size-2.5 !bg-[var(--surface)] !border-[var(--accent)]" />
      <div className="absolute -top-3 left-4 rounded-md px-2 py-0.5 text-xs font-semibold" style={{ background: "var(--surface)", color, border: `1px solid ${color}55` }}>
        {editing ? <InlineTitle id={id} title={data.title} /> : (data.icon ? `${data.icon} ` : "") + (data.title || "Group")}
      </div>
    </div>
  );
});

export const nodeTypes = { mind: MindNodeView, group: GroupNodeView };
