"use client";
import Link from "next/link";
import { use } from "react";
import { ChevronRight, FileText, FolderPlus, FolderTree, Goal as GoalIcon, Lightbulb, Plus, Workflow } from "lucide-react";
import { useApi } from "@/lib/client/api";
import { useUI } from "@/lib/client/store";
import { ago } from "@/lib/client/format";
import type { Folder, Goal } from "@/lib/client/types";
import { Button } from "@/components/ui/button";
import { Card, EmptyState, MenuItem, PageSkeleton, Popover, Progress } from "@/components/ui/misc";

interface Contents {
  folder: Folder;
  breadcrumbs: { id: string; name: string; icon: string }[];
  children: Folder[];
  notes: { id: string; title: string; kind: string; updatedAt: string; contentText: string; tags: string[] }[];
  maps: { id: string; title: string; updatedAt: string; _count: { nodes: number } }[];
  projects: { id: string; title: string; color: string; status: string; _count: { tasks: number } }[];
  goals: Goal[];
}

export default function FolderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data, error } = useApi<Contents>(`/api/folders/${id}`);
  const { openCreate, setCapture } = useUI();
  if (error) return <p className="py-20 text-center text-sm text-muted">Folder not found. <Link href="/folders" className="text-accent">All folders</Link></p>;
  if (!data) return <PageSkeleton />;
  const f = data.folder;
  const empty = !data.children.length && !data.notes.length && !data.maps.length && !data.projects.length && !data.goals.length;
  return (
    <>
      <nav className="mb-2 flex items-center gap-1 text-sm text-muted" aria-label="Breadcrumb">
        <Link href="/folders" className="hover:text-text">Folders</Link>
        {data.breadcrumbs.map((b) => <span key={b.id} className="flex items-center gap-1"><ChevronRight className="size-3.5" /><Link href={`/folders/${b.id}`} className="hover:text-text">{b.icon} {b.name}</Link></span>)}
      </nav>
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div className="grid size-12 place-items-center rounded-2xl text-2xl" style={{ background: `${f.color}1f` }}>{f.icon}</div>
        <h1 className="flex-1 text-2xl font-semibold tracking-tight">{f.name}</h1>
        <Popover align="end" trigger={({ toggle }) => <Button variant="primary" onClick={toggle}><Plus className="size-4" /> Add</Button>}>
          {(close) => (
            <>
              <MenuItem icon={<FileText />} onClick={() => { close(); openCreate("note", { folderId: f.id }); }}>Note</MenuItem>
              <MenuItem icon={<Workflow />} onClick={() => { close(); openCreate("map", { folderId: f.id }); }}>Mind map</MenuItem>
              <MenuItem icon={<FolderTree />} onClick={() => { close(); openCreate("project", { folderId: f.id }); }}>Project</MenuItem>
              <MenuItem icon={<GoalIcon />} onClick={() => { close(); openCreate("goal", { folderId: f.id }); }}>Goal</MenuItem>
              <MenuItem icon={<FolderPlus />} onClick={() => { close(); openCreate("folder", { parentId: f.id }); }}>Subfolder</MenuItem>
            </>
          )}
        </Popover>
      </div>
      {empty ? (
        <EmptyState icon={<FolderPlus className="size-6" />} title="This folder is empty" body="Add notes, mind maps, projects or goals — or move captured thoughts here."
          action={<Button onClick={() => setCapture(true)}><Lightbulb className="size-4" /> Capture a thought</Button>} />
      ) : (
        <div className="space-y-8">
          {data.children.length > 0 && (
            <Section title="Subfolders">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {data.children.map((c) => <Link key={c.id} href={`/folders/${c.id}`}><Card className="flex items-center gap-2.5 p-3 hover:shadow-card"><span className="text-lg">{c.icon}</span><span className="truncate font-medium">{c.name}</span></Card></Link>)}
              </div>
            </Section>
          )}
          {data.goals.length > 0 && (
            <Section title="Goals">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {data.goals.map((g) => (
                  <Link key={g.id} href={`/goals/${g.id}`}><Card className="p-3 hover:shadow-card"><p className="mb-2 truncate font-medium">🎯 {g.title}</p><div className="flex items-center gap-2"><Progress value={g.progress} size="sm" /><span className="text-xs tabular text-muted">{g.progress}%</span></div></Card></Link>
                ))}
              </div>
            </Section>
          )}
          {data.projects.length > 0 && (
            <Section title="Projects">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {data.projects.map((p) => <Link key={p.id} href={`/projects/${p.id}`}><Card className="flex items-center gap-2.5 p-3 hover:shadow-card"><span className="size-2.5 rounded" style={{ background: p.color }} /><span className="flex-1 truncate font-medium">{p.title}</span><span className="text-xs text-muted">{p._count.tasks} tasks</span></Card></Link>)}
              </div>
            </Section>
          )}
          {data.maps.length > 0 && (
            <Section title="Mind maps">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {data.maps.map((m) => <Link key={m.id} href={`/maps/${m.id}`}><Card className="flex items-center gap-2.5 p-3 hover:shadow-card"><Workflow className="size-4 text-accent" /><span className="flex-1 truncate font-medium">{m.title}</span><span className="text-xs text-muted">{m._count.nodes} nodes</span></Card></Link>)}
              </div>
            </Section>
          )}
          {data.notes.length > 0 && (
            <Section title="Notes & thoughts">
              <Card className="divide-y divide-border overflow-hidden">
                {data.notes.map((n) => (
                  <Link key={n.id} href={`/notes/${n.id}`} className="flex gap-3 px-4 py-2.5 hover:bg-surface-2">
                    {n.kind === "THOUGHT" ? <Lightbulb className="mt-0.5 size-4 text-warning" /> : <FileText className="mt-0.5 size-4 text-muted" />}
                    <span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">{n.title}</span><span className="block truncate text-xs text-muted">{ago(n.updatedAt)} · {n.contentText}</span></span>
                  </Link>
                ))}
              </Card>
            </Section>
          )}
        </div>
      )}
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <section><h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted">{title}</h2>{children}</section>;
}
