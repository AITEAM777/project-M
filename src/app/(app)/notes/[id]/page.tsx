"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { use, useCallback, useEffect, useRef, useState } from "react";
import {
  Archive, ArchiveRestore, ArrowLeft, Check, CheckSquare, Download, FileText, History, Lightbulb, Loader2, Maximize2, Minimize2, MoreHorizontal, Paperclip,
  Sparkles, Star, Trash2, Workflow, X,
} from "lucide-react";
import { del, invalidate, patch, post, useApi } from "@/lib/client/api";
import { confirm, toast } from "@/lib/client/store";
import { useMe } from "@/lib/client/hooks";
import { ago, bytes } from "@/lib/client/format";
import { docToMarkdown } from "@/lib/richtext";
import type { AiSuggestion, Note } from "@/lib/client/types";
import { RichEditor } from "@/components/editor/rich-editor";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { MenuItem, MenuSeparator, PageSkeleton, Popover, TagInput, Tabs } from "@/components/ui/misc";
import { FolderSelect } from "@/components/forms/options";
import { PlaceOnMap } from "@/components/shared/place-on-map";
import { SuggestionView } from "@/components/ai/suggestion-view";
import { cn } from "@/lib/utils";

type Save = "saved" | "saving" | "dirty" | "error";

export default function NotePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data, error, mutate } = useApi<{ note: Note }>(`/api/notes/${id}`, { revalidateOnFocus: false, keepPreviousData: false });
  if (error) return <div className="py-20 text-center text-sm text-muted">This note could not be opened ({error.message}). <Link className="text-accent" href="/notes">Back to notes</Link></div>;
  if (!data || data.note.id !== id) return <PageSkeleton />;
  return <NoteEditor key={id} note={data.note} reload={() => mutate()} />;
}

function NoteEditor({ note, reload }: { note: Note; reload: () => void }) {
  const router = useRouter();
  const { data: me } = useMe();
  const aiOn = !!(me?.aiAvailable && me.user.aiEnabled);
  const [title, setTitle] = useState(note.title === "Untitled" ? "" : note.title);
  const [save, setSave] = useState<Save>("saved");
  const [focus, setFocus] = useState(false);
  const [versionsOpen, setVersionsOpen] = useState(false);
  const [ai, setAi] = useState<AiSuggestion | null>(null);
  const [aiBusy, setAiBusy] = useState(false);
  const pending = useRef<{ title?: string; content?: unknown }>({});
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestDoc = useRef<unknown>(note.content);

  const flush = useCallback(async () => {
    if (timer.current) clearTimeout(timer.current);
    const body = pending.current;
    if (!Object.keys(body).length) return;
    pending.current = {};
    setSave("saving");
    try {
      await patch(`/api/notes/${note.id}`, body);
      setSave(Object.keys(pending.current).length ? "dirty" : "saved");
      invalidate("/api/notes", "/api/dashboard");
    } catch (e) {
      pending.current = { ...body, ...pending.current };
      setSave("error");
      toast.error(e);
    }
  }, [note.id]);

  const queue = (patchBody: { title?: string; content?: unknown }) => {
    pending.current = { ...pending.current, ...patchBody };
    setSave("dirty");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => void flush(), 800);
  };

  useEffect(() => {
    const before = (e: BeforeUnloadEvent) => { if (Object.keys(pending.current).length) e.preventDefault(); };
    window.addEventListener("beforeunload", before);
    return () => {
      window.removeEventListener("beforeunload", before);
      if (Object.keys(pending.current).length) {
        fetch(`/api/notes/${note.id}?tzo=0`, { method: "PATCH", keepalive: true, headers: { "Content-Type": "application/json" }, body: JSON.stringify(pending.current) }).catch(() => {});
      }
    };
  }, [note.id]);

  useEffect(() => {
    if (!focus) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setFocus(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [focus]);

  const update = async (body: object, msg?: string) => {
    try { await flush(); await patch(`/api/notes/${note.id}`, body); reload(); invalidate("/api/notes", "/api/folders"); if (msg) toast.success(msg); } catch (e) { toast.error(e); }
  };

  const toTask = async () => {
    try {
      await flush();
      const { task } = await post<{ task: { id: string } }>("/api/tasks", { title: (title || "Untitled").slice(0, 300), description: `From note: ${title}\n\n${docToMarkdown(latestDoc.current).slice(0, 4000)}` });
      invalidate("/api/tasks", "/api/dashboard");
      toast.success("Task created from this note", { label: "Open", run: () => router.push(`/tasks?task=${task.id}`) });
    } catch (e) { toast.error(e); }
  };

  const exportMd = () => {
    const blob = new Blob([`# ${title || "Untitled"}\n\n${docToMarkdown(latestDoc.current)}`], { type: "text/markdown" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${(title || "note").replace(/[^a-z0-9-_ ]/gi, "").slice(0, 60) || "note"}.md`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const organize = async () => {
    setAiBusy(true);
    try { await flush(); const { suggestion } = await post<{ suggestion: AiSuggestion }>("/api/ai/organize", { noteId: note.id }); setAi(suggestion); } catch (e) { toast.error(e); } finally { setAiBusy(false); }
  };

  const editor = (
    <div className={cn("mx-auto w-full", focus ? "max-w-3xl" : "max-w-3xl")}>
      <textarea
        value={title}
        onChange={(e) => { setTitle(e.target.value.replace(/\n/g, "")); queue({ title: e.target.value.replace(/\n/g, "").trim() || "Untitled" }); }}
        placeholder={note.kind === "THOUGHT" ? "What's the thought?" : "Untitled"}
        rows={1}
        className="mb-2 w-full resize-none bg-transparent text-3xl font-bold tracking-tight outline-none placeholder:text-muted/60 [field-sizing:content]"
        aria-label="Title"
        autoFocus={!title}
      />
      <RichEditor noteId={note.id} content={note.content} onChange={(doc) => { latestDoc.current = doc; queue({ content: doc }); }} onUploaded={reload} />
    </div>
  );

  if (focus) {
    return (
      <div className="fixed inset-0 z-40 overflow-y-auto bg-bg animate-fade-in">
        <div className="sticky top-0 z-20 flex items-center justify-end gap-2 px-4 py-3">
          <SaveBadge s={save} />
          <Button variant="ghost" size="sm" onClick={() => setFocus(false)}><Minimize2 className="size-4" /> Exit focus</Button>
        </div>
        <div className="px-6 pb-20 pt-6">{editor}</div>
      </div>
    );
  }

  return (
    <div className="grid gap-8 xl:grid-cols-[1fr_300px]">
      <div className="min-w-0">
        <div className="mb-5 flex flex-wrap items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => router.back()}><ArrowLeft className="size-4" /> Back</Button>
          <Tabs value={note.kind} onChange={(k) => update({ kind: k }, k === "THOUGHT" ? "Marked as thought" : "Marked as note")} items={[
            { value: "THOUGHT", label: <span className="flex items-center gap-1"><Lightbulb className="size-3.5" />Thought</span> },
            { value: "NOTE", label: <span className="flex items-center gap-1"><FileText className="size-3.5" />Note</span> },
          ]} />
          <SaveBadge s={save} />
          <div className="flex-1" />
          {aiOn && <Button variant="soft" size="sm" loading={aiBusy} onClick={organize}>{!aiBusy && <Sparkles className="size-4" />} Organize</Button>}
          <Button variant="ghost" size="sm" onClick={() => setFocus(true)} aria-label="Focus mode"><Maximize2 className="size-4" /><span className="hidden sm:inline">Focus</span></Button>
          <Button variant="ghost" size="icon-sm" aria-label={note.favorite ? "Unfavorite" : "Favorite"} onClick={() => update({ favorite: !note.favorite })}>
            <Star className={cn("size-4", note.favorite && "fill-amber-400 text-amber-400")} />
          </Button>
          <Popover align="end" trigger={({ toggle }) => <Button variant="ghost" size="icon-sm" onClick={toggle} aria-label="More actions"><MoreHorizontal className="size-4" /></Button>}>
            {(close) => (
              <>
                <MenuItem icon={<CheckSquare />} onClick={() => { close(); toTask(); }}>Turn into a task</MenuItem>
                <MenuItem icon={<History />} onClick={() => { close(); setVersionsOpen(true); }}>Version history</MenuItem>
                <MenuItem icon={<Download />} onClick={() => { close(); exportMd(); }}>Export as Markdown</MenuItem>
                <MenuSeparator />
                {note.archivedAt ? (
                  <MenuItem icon={<ArchiveRestore />} onClick={() => { close(); update({ archived: false }, "Restored"); }}>Restore from archive</MenuItem>
                ) : (
                  <MenuItem icon={<Archive />} onClick={() => { close(); update({ archived: true }, "Archived — find it under Notes › Archived"); }}>Archive</MenuItem>
                )}
                <MenuItem icon={<Trash2 />} danger onClick={async () => {
                  close();
                  if (!(await confirm({ title: "Delete this note permanently?", body: "Consider archiving instead — archived notes can be restored. Mind-map nodes linked to it are kept.", confirmLabel: "Delete forever", danger: true }))) return;
                  try { if (timer.current) clearTimeout(timer.current); pending.current = {}; await del(`/api/notes/${note.id}`); invalidate("/api/notes", "/api/dashboard", "/api/folders"); toast.success("Note deleted"); router.push("/notes"); } catch (e) { toast.error(e); }
                }}>Delete</MenuItem>
              </>
            )}
          </Popover>
        </div>
        {note.archivedAt && <div className="mb-4 rounded-xl bg-warning-soft px-4 py-2.5 text-sm text-warning">This note is archived. <button className="font-medium underline" onClick={() => update({ archived: false }, "Restored")}>Restore it</button></div>}
        {ai && <div className="mb-6"><SuggestionView s={ai} onResolved={() => { setAi(null); reload(); }} /></div>}
        {editor}
      </div>

      <aside className="space-y-5 text-sm xl:sticky xl:top-0 xl:self-start">
        <Meta label="Folder"><FolderSelect value={note.folderId} onChange={(v) => update({ folderId: v }, "Moved")} noneLabel="No folder (inbox)" /></Meta>
        <Meta label="Tags"><TagInput value={note.tags} onChange={(tags) => update({ tags })} /></Meta>
        <Meta label="Details">
          <p className="text-muted">Created {ago(note.createdAt)}</p>
          <p className="text-muted">Edited {ago(note.updatedAt)}</p>
        </Meta>
        <Meta label="On mind maps" action={<PlaceOnMap type="note" id={note.id} size="xs" label="Add" />}>
          {!note.nodes.length ? <p className="text-muted">Not on any map yet.</p> : note.nodes.map((n) => (
            <Link key={n.id} href={`/maps/${n.map.id}?node=${n.id}`} className="flex items-center gap-2 py-0.5 text-accent hover:underline"><Workflow className="size-3.5" />{n.map.title}</Link>
          ))}
        </Meta>
        <Meta label={`Backlinks (${note.linksIn.length})`}>
          {!note.linksIn.length ? <p className="text-muted">No notes link here yet. Use the 📓 button in the toolbar to link notes.</p> : note.linksIn.map((l) => (
            <Link key={l.source.id} href={`/notes/${l.source.id}`} className="block py-0.5 hover:underline">↙ {l.source.title}</Link>
          ))}
        </Meta>
        {note.linksOut.length > 0 && (
          <Meta label="Links to">
            {note.linksOut.map((l) => <Link key={l.target.id} href={`/notes/${l.target.id}`} className="block py-0.5 hover:underline">↗ {l.target.title}</Link>)}
          </Meta>
        )}
        <Meta label={`Attachments (${note.attachments.length})`}>
          {!note.attachments.length ? <p className="text-muted">Drop or paste images into the note, or use the image button.</p> : note.attachments.map((a) => (
            <div key={a.id} className="flex items-center gap-2 py-0.5">
              <Paperclip className="size-3.5 text-muted" />
              <a href={`/api/attachments/${a.id}`} target="_blank" rel="noopener noreferrer" className="flex-1 truncate hover:underline">{a.filename}</a>
              <span className="text-xs text-muted">{bytes(a.size)}</span>
              <button aria-label="Delete attachment" className="text-muted hover:text-danger" onClick={async () => {
                if (await confirm({ title: "Delete attachment?", body: "Images using it in the note will stop displaying.", confirmLabel: "Delete", danger: true })) { await del(`/api/attachments/${a.id}`); reload(); }
              }}><X className="size-3.5" /></button>
            </div>
          ))}
        </Meta>
      </aside>
      <VersionsDialog open={versionsOpen} onClose={() => setVersionsOpen(false)} noteId={note.id} onRestored={() => window.location.reload()} />
    </div>
  );
}

function Meta({ label, children, action }: { label: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <section>
      <div className="mb-1.5 flex items-center justify-between"><h3 className="text-[11px] font-semibold uppercase tracking-wide text-muted">{label}</h3>{action}</div>
      {children}
    </section>
  );
}

function SaveBadge({ s }: { s: Save }) {
  if (s === "error") return <span className="text-xs text-danger">Not saved — retrying on next edit</span>;
  if (s === "saving" || s === "dirty") return <span className="flex items-center gap-1 text-xs text-muted"><Loader2 className="size-3 animate-spin" /> Saving…</span>;
  return <span className="flex items-center gap-1 text-xs text-muted"><Check className="size-3.5 text-success" /> Saved</span>;
}

function VersionsDialog({ open, onClose, noteId, onRestored }: { open: boolean; onClose: () => void; noteId: string; onRestored: () => void }) {
  const { data } = useApi<{ versions: { id: string; title: string; createdAt: string; content: unknown }[] }>(open ? `/api/notes/${noteId}/versions` : null);
  const [sel, setSel] = useState<string | null>(null);
  const v = data?.versions.find((x) => x.id === sel);
  return (
    <Dialog open={open} onClose={onClose} title="Version history" description="Snapshots are taken automatically while you write (at most every 10 minutes). Restoring keeps a copy of the current version." size="lg">
      {!data ? <p className="text-sm text-muted">Loading…</p> : !data.versions.length ? <p className="text-sm text-muted">No earlier versions yet.</p> : (
        <div className="grid gap-4 sm:grid-cols-[200px_1fr]">
          <ul className="max-h-80 space-y-1 overflow-y-auto">
            {data.versions.map((x) => (
              <li key={x.id}><button onClick={() => setSel(x.id)} className={cn("w-full rounded-lg px-2.5 py-1.5 text-left text-sm", sel === x.id ? "bg-accent-soft text-accent" : "hover:bg-surface-2")}>{new Date(x.createdAt).toLocaleString()}</button></li>
            ))}
          </ul>
          <div className="min-h-40 rounded-xl border border-border p-3">
            {v ? (
              <>
                <p className="font-semibold">{v.title}</p>
                <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap font-sans text-sm text-text-2">{docToMarkdown(v.content)}</pre>
                <Button className="mt-3" size="sm" variant="primary" onClick={async () => { try { await post(`/api/notes/${noteId}/versions`, { versionId: v.id }); toast.success("Version restored"); onRestored(); } catch (e) { toast.error(e); } }}>Restore this version</Button>
              </>
            ) : <p className="text-sm text-muted">Select a version to preview it.</p>}
          </div>
        </div>
      )}
    </Dialog>
  );
}
