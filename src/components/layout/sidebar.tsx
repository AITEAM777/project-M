"use client";
import { tr, translated } from "@/lib/i18n";
import { SidebarPlan } from "@/components/billing/plan-widgets";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import {
  Archive, CalendarDays, CheckSquare, ChevronDown, ChevronRight, FileText, FolderPlus, FolderTree, Goal, History,
  LayoutDashboard, Lightbulb, MoreHorizontal, Network, Pencil, Plus, Repeat, Settings, Sparkles, Star, Trash2, Waypoints, Workflow,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { del, invalidate, patch, post, useApi } from "@/lib/client/api";
import { confirm, toast, useUI, useWorkspace } from "@/lib/client/store";
import { useMe } from "@/lib/client/hooks";
import type { Folder, Workspace } from "@/lib/client/types";
import { MenuItem, MenuSeparator, Popover } from "@/components/ui/misc";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { LogoMark } from "./logo";

const NAV = translated([
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/thoughts", label: "My Thoughts", icon: Lightbulb },
  { href: "/notes", label: "Notes", icon: FileText },
  { href: "/maps", label: "Mind Maps", icon: Workflow },
  { href: "/projects", label: "Projects", icon: FolderTree },
  { href: "/tasks", label: "Tasks", icon: CheckSquare },
  { href: "/goals", label: "Goals", icon: Goal },
  { href: "/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/habits", label: "Habits", icon: Repeat },
  { href: "/graph", label: "Knowledge Graph", icon: Network },
  { href: "/timeline", label: "Timeline", icon: History },
]);

export function Sidebar({ workspaces, onWorkspacesChange, className }: { workspaces: Workspace[]; onWorkspacesChange: (w: Workspace[]) => void; className?: string }) {
  const pathname = usePathname();
  const { data: me } = useMe();
  const ai = me?.aiAvailable && me.user.aiEnabled;
  return (
    <aside className={cn("w-64 shrink-0 border-r border-border bg-surface flex flex-col h-dvh", className)} aria-label={tr("Sidebar")}>
      <WorkspaceSwitcher workspaces={workspaces} onChange={onWorkspacesChange} />
      <nav data-tour="sidebar" className="px-2 pt-1 space-y-0.5" aria-label={tr("Main")}>
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(href + "/"));
          return (
            <Link key={href} href={href} aria-current={active ? "page" : undefined}
              className={cn("flex items-center gap-2.5 h-8 px-2.5 rounded-lg text-[13.5px] transition-colors", active ? "bg-accent-soft text-accent font-medium" : "text-text-2 hover:bg-surface-2 hover:text-text")}>
              <Icon className="size-[17px] shrink-0" strokeWidth={active ? 2.2 : 1.8} />
              {label}
            </Link>
          );
        })}
        {ai && (
          <Link href="/assistant" className={cn("flex items-center gap-2.5 h-8 px-2.5 rounded-lg text-[13.5px] transition-colors", pathname === "/assistant" ? "bg-accent-soft text-accent font-medium" : "text-text-2 hover:bg-surface-2 hover:text-text")}>
            <Sparkles className="size-[17px]" strokeWidth={1.8} />{" "}{tr("AI Assistant")}
          </Link>
        )}
      </nav>
      <Folders />
      <SidebarPlan />
      <div className="border-t border-border p-2">
        <Link href="/settings" className={cn("flex items-center gap-2.5 h-8 px-2.5 rounded-lg text-[13.5px]", pathname === "/settings" ? "bg-accent-soft text-accent font-medium" : "text-text-2 hover:bg-surface-2")}>
          <Settings className="size-[17px]" strokeWidth={1.8} />{" "}{tr("Settings")}
        </Link>
      </div>
    </aside>
  );
}

function WorkspaceSwitcher({ workspaces, onChange }: { workspaces: Workspace[]; onChange: (w: Workspace[]) => void }) {
  const { id, set } = useWorkspace();
  const router = useRouter();
  const current = workspaces.find((w) => w.id === id) ?? workspaces[0];
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const create = async () => {
    setBusy(true);
    try {
      const { workspace } = await post<{ workspace: Workspace }>("/api/workspaces", { name });
      onChange([...workspaces, workspace]);
      set(workspace.id);
      setCreating(false);
      setName("");
      router.push("/dashboard");
    } catch (e) { toast.error(e); } finally { setBusy(false); }
  };
  return (
    <div className="p-2">
      <Popover
        className="w-60"
        trigger={({ toggle }) => (
          <button onClick={toggle} className="w-full flex items-center gap-2.5 rounded-xl px-2 py-1.5 hover:bg-surface-2 text-left" aria-label={tr("Switch workspace")}>
            <LogoMark className="size-7 shrink-0" />
            <span className="min-w-0 flex-1">
              <span className="block text-[11px] text-muted leading-tight">{tr("Nodera")}</span>
              <span className="block truncate text-sm font-semibold leading-tight">{current.icon} {current.name}</span>
            </span>
            <ChevronDown className="size-4 text-muted" />
          </button>
        )}
      >
        {(close) => (
          <>
            <p className="px-2.5 pt-1.5 pb-1 text-[11px] font-medium uppercase tracking-wide text-muted">{tr("Workspaces")}</p>
            {workspaces.map((w) => (
              <MenuItem key={w.id} active={w.id === current.id} onClick={() => { set(w.id); close(); router.push("/dashboard"); }} icon={<span>{w.icon}</span>}>
                {w.name}
              </MenuItem>
            ))}
            <MenuSeparator />
            <MenuItem icon={<Plus />} onClick={() => { close(); setCreating(true); }}>{tr("New workspace")}</MenuItem>
          </>
        )}
      </Popover>
      <Dialog open={creating} onClose={() => setCreating(false)} title={tr("New workspace")} description={tr("Workspaces keep separate areas (e.g. Personal, Work) completely apart.")} size="sm"
        footer={<><Button variant="ghost" onClick={() => setCreating(false)}>{tr("Cancel")}</Button><Button variant="primary" loading={busy} disabled={!name.trim()} onClick={create}>{tr("Create")}</Button></>}>
        <Field label={tr("Name")}><Input value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && name.trim() && create()} placeholder={tr("Work")} autoFocus /></Field>
      </Dialog>
    </div>
  );
}

function Folders() {
  const { data, mutate } = useApi<{ folders: Folder[] }>("/api/folders");
  const { openCreate } = useUI();
  const [open, setOpen] = useState(true);
  const tree = useMemo(() => {
    const by = new Map<string | null, Folder[]>();
    for (const f of data?.folders ?? []) by.set(f.parentId, [...(by.get(f.parentId) ?? []), f]);
    return by;
  }, [data]);
  const favorites = (data?.folders ?? []).filter((f) => f.favorite);
  return (
    <div className="mt-3 flex-1 min-h-0 overflow-y-auto px-2 pb-3">
      {favorites.length > 0 && (
        <div className="mb-2">
          <p className="px-2.5 py-1 text-[11px] font-medium uppercase tracking-wide text-muted">{tr("Favorites")}</p>
          {favorites.map((f) => <FolderRow key={`fav-${f.id}`} folder={f} tree={tree} depth={0} onChange={() => mutate()} flat />)}
        </div>
      )}
      <div className="group flex items-center justify-between px-2.5 py-1">
        <button onClick={() => setOpen(!open)} className="flex items-center gap-1 text-[11px] font-medium uppercase tracking-wide text-muted hover:text-text">
          {open ? <ChevronDown className="size-3" /> : <ChevronRight className="size-3" />}{" "}{tr("Folders")}
        </button>
        <span className="flex items-center gap-0.5">
          <Link href="/folders" className="p-1 rounded text-muted hover:bg-surface-2 hover:text-text" aria-label={tr("All folders")}><Waypoints className="size-3.5" /></Link>
          <button onClick={() => openCreate("folder")} className="p-1 rounded text-muted hover:bg-surface-2 hover:text-text" aria-label={tr("New folder")}><FolderPlus className="size-3.5" /></button>
        </span>
      </div>
      {open && (
        <div className="space-y-px">
          {(tree.get(null) ?? []).map((f) => <FolderRow key={f.id} folder={f} tree={tree} depth={0} onChange={() => mutate()} />)}
          {data && !data.folders.length && <p className="px-2.5 py-2 text-xs text-muted">{tr("No folders yet.")}</p>}
        </div>
      )}
    </div>
  );
}

function FolderRow({ folder, tree, depth, onChange, flat }: { folder: Folder; tree: Map<string | null, Folder[]>; depth: number; onChange: () => void; flat?: boolean }) {
  const pathname = usePathname();
  const router = useRouter();
  const { openCreate } = useUI();
  const kids = flat ? [] : tree.get(folder.id) ?? [];
  const [expanded, setExpanded] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState(folder.name);
  const active = pathname === `/folders/${folder.id}`;
  const update = async (body: object, msg?: string) => {
    try { await patch(`/api/folders/${folder.id}`, body); onChange(); invalidate("/api/folders"); if (msg) toast.success(msg); } catch (e) { toast.error(e); }
  };
  const remove = async () => {
    if (!(await confirm({ title: tr("Delete “{title}”?", { title: folder.name }), body: tr("Subfolders are deleted too. Notes, maps, projects and goals inside are kept and moved out of the folder."), confirmLabel: tr("Delete folder"), danger: true }))) return;
    try { await del(`/api/folders/${folder.id}`); onChange(); if (active) router.push("/folders"); toast.success(tr("Folder deleted")); } catch (e) { toast.error(e); }
  };
  return (
    <div>
      <div className={cn("group flex items-center h-8 rounded-lg pr-1 text-[13.5px]", active ? "bg-accent-soft text-accent font-medium" : "text-text-2 hover:bg-surface-2")} style={{ paddingLeft: 4 + depth * 14 }}>
        <button onClick={() => setExpanded(!expanded)} className={cn("p-0.5 rounded text-muted", !kids.length && "invisible")} aria-label={expanded ? tr("Collapse") : tr("Expand")}>
          {expanded ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
        </button>
        {renaming ? (
          <input autoFocus value={name} onChange={(e) => setName(e.target.value)} onBlur={() => { setRenaming(false); if (name.trim() && name !== folder.name) update({ name: name.trim() }); }}
            onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); if (e.key === "Escape") { setName(folder.name); setRenaming(false); } }}
            className="flex-1 min-w-0 bg-surface border border-accent rounded px-1 text-sm outline-none" />
        ) : (
          <Link href={`/folders/${folder.id}`} className="flex-1 min-w-0 flex items-center gap-2 truncate pl-1">
            <span className="text-[14px] leading-none">{folder.icon}</span>
            <span className="truncate">{folder.name}</span>
          </Link>
        )}
        <Popover align="end" trigger={({ toggle }) => (
          <button onClick={toggle} className="p-1 rounded opacity-0 group-hover:opacity-100 focus:opacity-100 text-muted hover:text-text" aria-label={tr("Folder actions")}><MoreHorizontal className="size-4" /></button>
        )}>
          {(close) => (
            <>
              <MenuItem icon={<FolderPlus />} onClick={() => { close(); openCreate("folder", { parentId: folder.id }); setExpanded(true); }}>{tr("New subfolder")}</MenuItem>
              <MenuItem icon={<Pencil />} onClick={() => { close(); setRenaming(true); }}>{tr("Rename")}</MenuItem>
              <MenuItem icon={<Star />} onClick={() => { close(); update({ favorite: !folder.favorite }); }}>{folder.favorite ? tr("Remove from favorites") : tr("Add to favorites")}</MenuItem>
              <MenuItem icon={<Archive />} onClick={() => { close(); update({ archived: true }, "Folder archived — restore it from All Folders"); }}>{tr("Archive")}</MenuItem>
              <MenuSeparator />
              <MenuItem icon={<Trash2 />} danger onClick={() => { close(); remove(); }}>{tr("Delete")}</MenuItem>
            </>
          )}
        </Popover>
      </div>
      {expanded && kids.map((k) => <FolderRow key={k.id} folder={k} tree={tree} depth={depth + 1} onChange={onChange} />)}
    </div>
  );
}

