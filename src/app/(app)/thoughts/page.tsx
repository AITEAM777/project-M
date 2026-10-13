"use client";
import Link from "next/link";
import { useState } from "react";
import { Archive, CheckSquare, FileText, FolderInput, Lightbulb, MoreHorizontal, Zap } from "lucide-react";
import { invalidate, patch, post, useApi } from "@/lib/client/api";
import { toast } from "@/lib/client/store";
import { ago } from "@/lib/client/format";
import type { Folder, NoteSummary } from "@/lib/client/types";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { Card, EmptyState, Kbd, MenuItem, MenuSeparator, PageSkeleton, Popover, Tabs } from "@/components/ui/misc";
import { PageHeader } from "@/components/shared/page-header";
import { PlaceOnMap } from "@/components/shared/place-on-map";

/** The thought inbox: capture fast, then organize — into folders, tasks, notes or maps. */
export default function ThoughtsPage() {
  const [filter, setFilter] = useState<"inbox" | "all">("inbox");
  const { data, mutate } = useApi<{ notes: NoteSummary[] }>(`/api/notes?kind=THOUGHT${filter === "inbox" ? "&folder=none" : ""}`);
  const { data: folders } = useApi<{ folders: Folder[] }>("/api/folders");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  const capture = async () => {
    if (!text.trim()) return;
    setBusy(true);
    try { await post("/api/notes", { kind: "THOUGHT", text }); setText(""); mutate(); invalidate("/api/dashboard"); } catch (e) { toast.error(e); } finally { setBusy(false); }
  };
  const update = async (id: string, body: object, msg: string) => {
    try { await patch(`/api/notes/${id}`, body); mutate(); invalidate("/api/notes", "/api/folders", "/api/dashboard"); toast.success(msg); } catch (e) { toast.error(e); }
  };
  const toTask = async (n: NoteSummary) => {
    try {
      await post("/api/tasks", { title: n.title.slice(0, 300), description: n.contentText !== n.title ? n.contentText : "" });
      await update(n.id, { archived: true }, "Turned into a task (thought archived)");
      invalidate("/api/tasks");
    } catch (e) { toast.error(e); }
  };

  return (
    <>
      <PageHeader title="My Thoughts" icon={<Lightbulb className="size-6 text-warning" />} description="Capture first, organize later. Unfiled thoughts stay in your inbox."
        actions={<Tabs value={filter} onChange={setFilter} items={[{ value: "inbox", label: "Inbox" }, { value: "all", label: "All thoughts" }]} />} />
      <Card className="mb-6 p-3">
        <Textarea value={text} onChange={(e) => setText(e.target.value)} rows={2} className="border-0 shadow-none focus:ring-0" placeholder="What's on your mind?"
          onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); capture(); } }} aria-label="New thought" />
        <div className="flex items-center justify-between px-1 pt-1">
          <span className="text-xs text-muted"><Kbd>⌘</Kbd> <Kbd>↵</Kbd> to save · press <Kbd>Q</Kbd> anywhere for quick capture</span>
          <Button variant="primary" size="sm" loading={busy} disabled={!text.trim()} onClick={capture}><Zap className="size-4" /> Capture</Button>
        </div>
      </Card>
      {!data ? <PageSkeleton /> : !data.notes.length ? (
        <EmptyState icon={<Lightbulb className="size-6" />} title={filter === "inbox" ? "Inbox zero" : "No thoughts yet"} body={filter === "inbox" ? "Every thought has a home. Capture something new above." : "Capture ideas, observations and questions as they come."} />
      ) : (
        <div className="columns-1 gap-4 sm:columns-2 xl:columns-3 [&>*]:mb-4">
          {data.notes.map((n) => (
            <Card key={n.id} className="break-inside-avoid p-4 transition-shadow hover:shadow-card">
              <Link href={`/notes/${n.id}`} className="block">
                <p className="font-medium leading-snug">{n.title}</p>
                {n.contentText && n.contentText.trim() !== n.title.trim() && <p className="mt-1.5 line-clamp-5 whitespace-pre-line text-sm text-text-2">{n.contentText}</p>}
              </Link>
              <div className="mt-3 flex items-center gap-1">
                <span className="flex-1 text-xs text-muted">{ago(n.createdAt)}{n.folder ? ` · ${n.folder.icon} ${n.folder.name}` : ""}</span>
                <PlaceOnMap type="note" id={n.id} size="xs" label="Map" />
                <Popover align="end" trigger={({ toggle }) => <Button variant="ghost" size="icon-sm" onClick={toggle} aria-label="Organize thought"><MoreHorizontal className="size-4" /></Button>}>
                  {(close) => (
                    <>
                      <MenuItem icon={<CheckSquare />} onClick={() => { close(); toTask(n); }}>Turn into a task</MenuItem>
                      <MenuItem icon={<FileText />} onClick={() => { close(); update(n.id, { kind: "NOTE" }, "Promoted to a note"); }}>Promote to note</MenuItem>
                      <MenuSeparator />
                      <p className="flex items-center gap-1.5 px-2.5 pt-1 pb-0.5 text-[11px] font-medium uppercase text-muted"><FolderInput className="size-3" /> Move to folder</p>
                      {folders?.folders.map((f) => <MenuItem key={f.id} onClick={() => { close(); update(n.id, { folderId: f.id }, `Moved to ${f.name}`); }}>{f.icon} {f.name}</MenuItem>)}
                      <MenuSeparator />
                      <MenuItem icon={<Archive />} onClick={() => { close(); update(n.id, { archived: true }, "Archived"); }}>Archive</MenuItem>
                    </>
                  )}
                </Popover>
              </div>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
