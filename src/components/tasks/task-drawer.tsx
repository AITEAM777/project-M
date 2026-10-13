"use client";
import Link from "next/link";
import { useEffect } from "react";
import { createPortal } from "react-dom";
import { Trash2, Workflow, X } from "lucide-react";
import { del, invalidate, patch, useApi } from "@/lib/client/api";
import { confirm, toast, useUI } from "@/lib/client/store";
import type { Task } from "@/lib/client/types";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/misc";
import { Select } from "@/components/ui/input";
import { TaskForm } from "@/components/forms/task-form";

type TaskDetail = Task & { dependents: { task: { id: string; title: string; status: string } }[] };

/** Right-hand contextual panel for a task, available on every page. */
export function TaskDrawer() {
  const { taskId, openTask } = useUI();
  const { data, mutate } = useApi<{ task: TaskDetail }>(taskId ? `/api/tasks/${taskId}` : null, { keepPreviousData: false });
  const { data: all } = useApi<{ tasks: Task[] }>(taskId ? "/api/tasks?status=open&limit=300" : null);
  useEffect(() => {
    if (!taskId) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && !document.querySelector('[role="dialog"][aria-modal]') && openTask(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [taskId, openTask]);
  if (!taskId || typeof document === "undefined") return null;
  const t = data?.task;
  const close = () => openTask(null);
  const deps = t?.dependsOn?.map((d) => d.dependsOn) ?? [];
  const setDeps = async (ids: string[]) => {
    try { await patch(`/api/tasks/${taskId}`, { dependsOn: ids }); mutate(); invalidate("/api/tasks"); } catch (e) { toast.error(e); }
  };
  return createPortal(
    <div className="fixed inset-0 z-40 flex justify-end">
      <div className="absolute inset-0 bg-black/20 animate-fade-in" onClick={close} />
      <aside className="relative flex h-full w-full max-w-md flex-col border-l border-border bg-surface shadow-pop animate-slide-in" aria-label="Task details">
        <div className="flex items-center gap-2 border-b border-border px-5 py-3.5">
          <h2 className="flex-1 text-sm font-semibold">Task</h2>
          {t && (
            <Button variant="ghost" size="icon-sm" aria-label="Delete task" onClick={async () => {
              if (!(await confirm({ title: "Delete this task?", body: `“${t.title}” will be removed permanently. Mind-map nodes linked to it stay as plain thoughts.`, confirmLabel: "Delete", danger: true }))) return;
              try { await del(`/api/tasks/${t.id}`); invalidate("/api/tasks", "/api/dashboard", "/api/goals", "/api/projects"); close(); toast.success("Task deleted"); } catch (e) { toast.error(e); }
            }}><Trash2 className="size-4" /></Button>
          )}
          <Button variant="ghost" size="icon-sm" onClick={close} aria-label="Close"><X className="size-4" /></Button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {!t ? <div className="grid h-40 place-items-center"><Spinner /></div> : (
            <>
              <TaskForm key={t.id + t.status} task={t} onDone={() => mutate()} />
              <div className="mt-6 space-y-4 border-t border-border pt-4">
                <div>
                  <p className="mb-1.5 text-xs font-medium text-muted">Depends on</p>
                  <div className="space-y-1">
                    {deps.map((d) => (
                      <div key={d.id} className="flex items-center gap-2 text-sm">
                        <span className={d.status === "DONE" ? "text-success" : "text-warning"}>{d.status === "DONE" ? "✓" : "●"}</span>
                        <button className="flex-1 truncate text-left hover:underline" onClick={() => openTask(d.id)}>{d.title}</button>
                        <button className="text-muted hover:text-danger" aria-label="Remove dependency" onClick={() => setDeps(deps.filter((x) => x.id !== d.id).map((x) => x.id))}><X className="size-3.5" /></button>
                      </div>
                    ))}
                    <Select className="h-8" value="" onChange={(e) => e.target.value && setDeps([...deps.map((d) => d.id), e.target.value])} aria-label="Add dependency">
                      <option value="">+ Add a task this depends on…</option>
                      {all?.tasks.filter((x) => x.id !== t.id && !deps.some((d) => d.id === x.id)).map((x) => <option key={x.id} value={x.id}>{x.title}</option>)}
                    </Select>
                    {deps.some((d) => d.status !== "DONE") && <p className="text-xs text-warning">Blocked until {deps.filter((d) => d.status !== "DONE").length} task(s) are done.</p>}
                  </div>
                </div>
                {t.dependents.length > 0 && (
                  <div>
                    <p className="mb-1.5 text-xs font-medium text-muted">Blocks</p>
                    {t.dependents.map((d) => <button key={d.task.id} onClick={() => openTask(d.task.id)} className="block text-sm hover:underline">{d.task.title}</button>)}
                  </div>
                )}
                {!!t.nodes?.length && (
                  <div>
                    <p className="mb-1.5 text-xs font-medium text-muted">On mind maps</p>
                    {t.nodes.map((n) => (
                      <Link key={n.id} href={`/maps/${n.mapId}?node=${n.id}`} onClick={close} className="flex items-center gap-2 text-sm text-accent hover:underline"><Workflow className="size-3.5" />{n.map.title}</Link>
                    ))}
                  </div>
                )}
                {t.milestone && <p className="text-xs text-muted">Milestone: {t.milestone.title}</p>}
              </div>
            </>
          )}
        </div>
      </aside>
    </div>,
    document.body,
  );
}
