"use client";
import { tr } from "@/lib/i18n";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { use, useState } from "react";
import { Archive, ArrowLeft, Kanban, List, MoreHorizontal, Pencil, Star, Target, Trash2, Workflow } from "lucide-react";
import { del, invalidate, patch, useApi } from "@/lib/client/api";
import { confirm, toast } from "@/lib/client/store";
import { minutes, relDay } from "@/lib/client/format";
import type { Project, Task } from "@/lib/client/types";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Badge, Card, MenuItem, MenuSeparator, PageSkeleton, Popover, ProgressRing, Tabs } from "@/components/ui/misc";
import { ProjectForm, PROJECT_STATUS_LABEL } from "@/components/forms/other-forms";
import { TaskBoard } from "@/components/tasks/board";
import { TaskRow } from "@/components/tasks/task-row";
import { QuickAddTask } from "@/components/tasks/quick-add";
import { PlaceOnMap } from "@/components/shared/place-on-map";

type Detail = Project & { tasks: Task[]; nodes: { id: string; mapId: string; map: { title: string } }[] };

export default function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { data, error, mutate } = useApi<{ project: Detail }>(`/api/projects/${id}`);
  const [view, setView] = useState<"list" | "board">("board");
  const [editing, setEditing] = useState(false);
  if (error) return <p className="py-20 text-center text-sm text-muted">{tr("Project not found.")}{" "}<Link href="/projects" className="text-accent">{tr("Back")}</Link></p>;
  if (!data) return <PageSkeleton />;
  const p = data.project;
  const est = p.tasks.filter((t) => t.status !== "DONE").reduce((a, t) => a + (t.estimateMinutes ?? 0), 0);
  const spent = p.tasks.reduce((a, t) => a + (t.actualMinutes ?? 0), 0);
  const update = async (body: object, msg: string) => { try { await patch(`/api/projects/${p.id}`, body); mutate(); invalidate("/api/projects", "/api/dashboard"); toast.success(msg); } catch (e) { toast.error(e); } };

  return (
    <>
      <Button variant="ghost" size="sm" className="-ml-2 mb-3" onClick={() => router.push("/projects")}><ArrowLeft className="size-4" />{" "}{tr("Projects")}</Button>
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start">
        <ProgressRing value={p.progress.percent} size={64} stroke={6} color={p.color} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">{p.title}</h1>
            <Badge color={p.color}>{PROJECT_STATUS_LABEL[p.status]}</Badge>
          </div>
          {p.description && <p className="mt-1 max-w-2xl text-sm text-text-2 whitespace-pre-line">{p.description}</p>}
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted">
            <span>{tr("{a} of {b} tasks done", { a: p.progress.done, b: p.progress.total })}</span>
            {p.goal && <Link href={`/goals/${p.goal.id}`} className="inline-flex items-center gap-1 text-accent hover:underline"><Target className="size-3.5" />{p.goal.title}</Link>}
            {p.dueDate && <span>{tr("Deadline")}{" "}{relDay(p.dueDate)}</span>}
            {est > 0 && <span>~{minutes(est)} remaining</span>}
            {spent > 0 && <span>{minutes(spent)} spent</span>}
            {p.nodes.map((n) => <Link key={n.id} href={`/maps/${n.mapId}?node=${n.id}`} className="inline-flex items-center gap-1 text-accent hover:underline"><Workflow className="size-3.5" />{n.map.title}</Link>)}
          </div>
        </div>
        <div data-tour="project-actions" className="flex gap-2">
          <PlaceOnMap type="project" id={p.id} />
          <Button size="sm" onClick={() => setEditing(true)}><Pencil className="size-3.5" />{" "}{tr("Edit")}</Button>
          <Popover align="end" trigger={({ toggle }) => <Button size="icon-sm" variant="ghost" onClick={toggle} aria-label={tr("More")}><MoreHorizontal className="size-4" /></Button>}>
            {(close) => (
              <>
                {p.status !== "COMPLETED" && <MenuItem onClick={() => { close(); update({ status: "COMPLETED" }, "Project completed 🎉"); }}>{tr("Mark as completed")}</MenuItem>}
                <MenuItem icon={<Star />} onClick={() => { close(); update({ favorite: !p.favorite }, p.favorite ? "Unfavorited" : "Favorited"); }}>{p.favorite ? tr("Unfavorite") : tr("Favorite")}</MenuItem>
                <MenuItem icon={<Archive />} onClick={() => { close(); update({ archived: !p.archivedAt }, p.archivedAt ? "Restored" : "Archived"); }}>{p.archivedAt ? tr("Restore") : tr("Archive")}</MenuItem>
                <MenuSeparator />
                <MenuItem icon={<Trash2 />} danger onClick={async () => {
                  close();
                  if (!(await confirm({ title: tr("Delete “{title}”?", { title: p.title }), body: tr("Its tasks ({n}) will be kept without a project. Archive instead to keep everything.", { n: p.tasks.length }), confirmLabel: tr("Delete project"), danger: true }))) return;
                  try { await del(`/api/projects/${p.id}`); invalidate("/api/projects", "/api/tasks", "/api/dashboard"); router.push("/projects"); toast.success(tr("Project deleted")); } catch (e) { toast.error(e); }
                }}>{tr("Delete")}</MenuItem>
              </>
            )}
          </Popover>
        </div>
      </div>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex-1"><QuickAddTask defaults={{ projectId: p.id, goalId: p.goalId }} onAdded={() => mutate()} /></div>
        <Tabs value={view} onChange={setView} items={[{ value: "board", label: <span className="flex items-center gap-1"><Kanban className="size-3.5" />{tr("Board")}</span> }, { value: "list", label: <span className="flex items-center gap-1"><List className="size-3.5" />{tr("List")}</span> }]} />
      </div>
      {view === "board" ? <TaskBoard tasks={p.tasks} onChanged={() => mutate()} showProject={false} /> : (
        <Card className="p-2">
          {!p.tasks.length && <p className="p-6 text-center text-sm text-muted">{tr("No tasks yet — add the first step above.")}</p>}
          {p.tasks.map((t) => <TaskRow key={t.id} task={t} onChanged={() => mutate()} showProject={false} />)}
        </Card>
      )}
      <Dialog open={editing} onClose={() => setEditing(false)} title={tr("Edit project")}>
        <ProjectForm project={p} onDone={() => { setEditing(false); mutate(); }} onCancel={() => setEditing(false)} />
      </Dialog>
    </>
  );
}
