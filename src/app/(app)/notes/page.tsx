"use client";
import Link from "next/link";
import { useState } from "react";
import { FileText, Lightbulb, Plus, Search, Star } from "lucide-react";
import { useApi } from "@/lib/client/api";
import { useDebouncedValue } from "@/lib/client/hooks";
import { useUI } from "@/lib/client/store";
import { ago } from "@/lib/client/format";
import type { NoteSummary } from "@/lib/client/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, EmptyState, PageSkeleton, Tabs } from "@/components/ui/misc";
import { FolderSelect } from "@/components/forms/options";
import { PageHeader } from "@/components/shared/page-header";

export default function NotesPage() {
  const { openCreate } = useUI();
  const [q, setQ] = useState("");
  const [tab, setTab] = useState<"all" | "NOTE" | "THOUGHT" | "fav" | "archived">("all");
  const [folder, setFolder] = useState<string | null>(null);
  const dq = useDebouncedValue(q, 250);
  const params = new URLSearchParams();
  if (dq) params.set("q", dq);
  if (tab === "NOTE" || tab === "THOUGHT") params.set("kind", tab);
  if (tab === "fav") params.set("favorite", "1");
  if (tab === "archived") params.set("archived", "1");
  if (folder) params.set("folder", folder);
  const tagMatch = dq.match(/^#(\S+)$/);
  if (tagMatch) { params.delete("q"); params.set("tag", tagMatch[1]); }
  const { data } = useApi<{ notes: NoteSummary[] }>(`/api/notes?${params}`);

  return (
    <>
      <PageHeader title="Notes" description="Everything you've written — searchable, linkable and connected to your maps."
        actions={<Button variant="primary" onClick={() => openCreate("note")}><Plus className="size-4" /> New note</Button>} />
      <div className="mb-4 flex flex-col gap-2 lg:flex-row lg:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search titles and content, or #tag" className="pl-9" aria-label="Search notes" />
        </div>
        <div className="w-full lg:w-56"><FolderSelect value={folder} onChange={setFolder} noneLabel="All folders" /></div>
        <Tabs value={tab} onChange={setTab} className="overflow-x-auto" items={[
          { value: "all", label: "All" }, { value: "NOTE", label: "Notes" }, { value: "THOUGHT", label: "Thoughts" }, { value: "fav", label: "★" }, { value: "archived", label: "Archived" },
        ]} />
      </div>
      {!data ? <PageSkeleton /> : !data.notes.length ? (
        <EmptyState icon={<FileText className="size-6" />} title={dq || folder || tab !== "all" ? "No matching notes" : "No notes yet"} body="Notes support headings, checklists, tables, code, images and links to other notes."
          action={<Button variant="primary" onClick={() => openCreate("note")}><Plus className="size-4" /> Write a note</Button>} />
      ) : (
        <Card className="divide-y divide-border overflow-hidden">
          {data.notes.map((n) => (
            <Link key={n.id} href={`/notes/${n.id}`} className="flex gap-3 px-4 py-3 transition-colors hover:bg-surface-2">
              {n.kind === "THOUGHT" ? <Lightbulb className="mt-0.5 size-4 shrink-0 text-warning" /> : <FileText className="mt-0.5 size-4 shrink-0 text-muted" />}
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-1.5 truncate font-medium">{n.favorite && <Star className="size-3.5 shrink-0 fill-amber-400 text-amber-400" />}{n.title}</p>
                {n.contentText && <p className="mt-0.5 line-clamp-1 text-sm text-muted">{n.contentText}</p>}
                <p className="mt-1 flex flex-wrap gap-x-3 text-xs text-muted">
                  <span>{ago(n.updatedAt)}</span>
                  {n.folder && <span>{n.folder.icon} {n.folder.name}</span>}
                  {!!n._count?.nodes && <span>on {n._count.nodes} map{n._count.nodes > 1 ? "s" : ""}</span>}
                  {!!n._count?.linksIn && <span>{n._count.linksIn} backlink{n._count.linksIn > 1 ? "s" : ""}</span>}
                  {n.tags.map((t) => <span key={t} className="text-accent">#{t}</span>)}
                </p>
              </div>
            </Link>
          ))}
        </Card>
      )}
    </>
  );
}
