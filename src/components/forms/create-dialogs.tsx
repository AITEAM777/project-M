"use client";
import { tr, translated } from "@/lib/i18n";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { invalidate, post } from "@/lib/client/api";
import { toast, useUI } from "@/lib/client/store";
import { Dialog } from "@/components/ui/dialog";
import { TaskForm } from "./task-form";
import { GoalForm } from "./goal-form";
import { EventForm, FolderForm, HabitForm, MapForm, ProjectForm } from "./other-forms";

const TITLES: Record<string, string> = translated({ task: "New task", goal: "New goal", project: "New project", habit: "New habit", event: "New event", map: "New mind map", folder: "New folder" });

/** Global "create" dialogs opened from anywhere via useUI().openCreate(kind, defaults). */
export function CreateDialogs() {
  const { create, closeCreate } = useUI();
  const router = useRouter();
  const kind = create?.kind;
  const d = (create?.defaults ?? {}) as Record<string, never>;

  // Notes are created instantly and opened in the editor.
  useEffect(() => {
    if (kind !== "note") return;
    closeCreate();
    post<{ note: { id: string } }>("/api/notes", { title: tr("Untitled"), folderId: d.folderId ?? null })
      .then(({ note }) => { invalidate("/api/notes", "/api/folders"); router.push(`/notes/${note.id}`); })
      .catch(toast.error);
  }, [kind, closeCreate, router, d.folderId]);

  if (!kind || kind === "note") return null;
  return (
    <Dialog open onClose={closeCreate} title={TITLES[kind]} size={kind === "map" ? "lg" : "md"}>
      {kind === "task" && <TaskForm defaults={d} onDone={closeCreate} onCancel={closeCreate} />}
      {kind === "goal" && <GoalForm defaults={d} onDone={(g) => { closeCreate(); router.push(`/goals/${g.id}`); }} onCancel={closeCreate} />}
      {kind === "project" && <ProjectForm defaults={d} onDone={(p) => { closeCreate(); router.push(`/projects/${p.id}`); }} onCancel={closeCreate} />}
      {kind === "habit" && <HabitForm defaults={d} onDone={closeCreate} onCancel={closeCreate} />}
      {kind === "event" && <EventForm defaults={d} onDone={closeCreate} onCancel={closeCreate} />}
      {kind === "map" && <MapForm defaults={d} onDone={(id) => { closeCreate(); router.push(`/maps/${id}`); }} onCancel={closeCreate} />}
      {kind === "folder" && <FolderForm defaults={d} onDone={(id) => { closeCreate(); router.push(`/folders/${id}`); }} onCancel={closeCreate} />}
    </Dialog>
  );
}
