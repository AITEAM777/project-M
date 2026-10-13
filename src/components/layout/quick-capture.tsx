"use client";
import { tr } from "@/lib/i18n";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckSquare, FileText, Lightbulb } from "lucide-react";
import { invalidate, post, useApi } from "@/lib/client/api";
import { toast, useUI } from "@/lib/client/store";
import type { Folder } from "@/lib/client/types";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, Textarea } from "@/components/ui/input";
import { Kbd, Tabs } from "@/components/ui/misc";

type Kind = "THOUGHT" | "NOTE" | "TASK";

/** Capture an idea in seconds without leaving the current screen (shortcut: Q). */
export function QuickCapture() {
  const { captureOpen, setCapture } = useUI();
  const router = useRouter();
  const [text, setText] = useState("");
  const [kind, setKind] = useState<Kind>("THOUGHT");
  const [folderId, setFolderId] = useState("");
  const [busy, setBusy] = useState(false);
  const { data } = useApi<{ folders: Folder[] }>(captureOpen ? "/api/folders" : null);

  useEffect(() => {
    if (!captureOpen) return;
    try { const d = sessionStorage.getItem("nodera-capture"); if (d) setText(d); } catch {}
  }, [captureOpen]);
  useEffect(() => { try { sessionStorage.setItem("nodera-capture", text); } catch {} }, [text]);

  const save = async (open = false) => {
    if (!text.trim()) return;
    setBusy(true);
    try {
      let href = "";
      if (kind === "TASK") {
        const [title, ...rest] = text.trim().split("\n");
        const { task } = await post<{ task: { id: string } }>("/api/tasks", { title: title.slice(0, 300), description: rest.join("\n") });
        href = `/tasks?task=${task.id}`;
        invalidate("/api/tasks", "/api/dashboard");
      } else {
        const { note } = await post<{ note: { id: string } }>("/api/notes", { kind, text, folderId: folderId || null });
        href = `/notes/${note.id}`;
        invalidate("/api/notes", "/api/dashboard", "/api/folders");
      }
      setText("");
      try { sessionStorage.removeItem("nodera-capture"); } catch {}
      setCapture(false);
      toast.success(kind === "TASK" ? "Task added" : "Captured", open ? undefined : { label: tr("Open"), run: () => router.push(href) });
      if (open) router.push(href);
    } catch (e) {
      toast.error(e);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={captureOpen} onClose={() => setCapture(false)} title={tr("Quick capture")} size="md"
      footer={
        <div className="flex w-full items-center gap-2">
          <span className="hidden sm:block text-xs text-muted mr-auto"><Kbd>⌘</Kbd> <Kbd>↵</Kbd>{" "}{tr("to save")}</span>
          <Button variant="ghost" onClick={() => save(true)} disabled={!text.trim()} loading={busy}>{tr("Save & open")}</Button>
          <Button variant="primary" onClick={() => save()} disabled={!text.trim()} loading={busy}>{tr("Save")}</Button>
        </div>
      }>
      <div className="space-y-3">
        <Tabs value={kind} onChange={setKind} items={[
          { value: "THOUGHT", label: <span className="flex items-center gap-1.5"><Lightbulb className="size-3.5" />{tr("Thought")}</span> },
          { value: "NOTE", label: <span className="flex items-center gap-1.5"><FileText className="size-3.5" />{tr("Note")}</span> },
          { value: "TASK", label: <span className="flex items-center gap-1.5"><CheckSquare className="size-3.5" />{tr("Task")}</span> },
        ]} />
        <Textarea autoFocus value={text} onChange={(e) => setText(e.target.value)} rows={5}
          onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); save(); } }}
          placeholder={kind === "TASK" ? tr("What needs to be done? (first line = title)") : tr("What's on your mind? The first line becomes the title.")} />
        {kind !== "TASK" && (
          <Select value={folderId} onChange={(e) => setFolderId(e.target.value)} aria-label={tr("Folder")}>
            <option value="">{tr("No folder (inbox)")}</option>
            {data?.folders.map((f) => <option key={f.id} value={f.id}>{f.icon} {f.name}</option>)}
          </Select>
        )}
      </div>
    </Dialog>
  );
}
