"use client";
import Link from "next/link";
import { useState } from "react";
import { Archive, ArchiveRestore, Copy, MoreHorizontal, Plus, Star, Trash2, Workflow } from "lucide-react";
import { del, invalidate, patch, post, useApi } from "@/lib/client/api";
import { confirm, toast, useUI } from "@/lib/client/store";
import { ago } from "@/lib/client/format";
import type { MapSummary } from "@/lib/client/types";
import { Button } from "@/components/ui/button";
import { Card, EmptyState, MenuItem, MenuSeparator, PageSkeleton, Popover, Tabs } from "@/components/ui/misc";
import { PageHeader } from "@/components/shared/page-header";
import { useMe } from "@/lib/client/hooks";

export default function MapsPage() {
  const [tab, setTab] = useState<"active" | "archived">("active");
  const { data, mutate } = useApi<{ maps: MapSummary[] }>(`/api/maps${tab === "archived" ? "?archived=1" : ""}`);
  const { data: me } = useMe();
  const { openCreate } = useUI();
  const limit = me?.limits.activeMindMaps;
  const act = async (fn: () => Promise<unknown>, msg: string) => { try { await fn(); mutate(); invalidate("/api/dashboard"); toast.success(msg); } catch (e) { toast.error(e); } };

  return (
    <>
      <PageHeader title="Mind Maps" description="Infinite canvases where thoughts become connected plans."
        actions={<><Tabs value={tab} onChange={setTab} items={[{ value: "active", label: "Active" }, { value: "archived", label: "Archived" }]} /><Button variant="primary" onClick={() => openCreate("map")}><Plus className="size-4" /> New map</Button></>} />
      {tab === "active" && limit != null && data && <p className="-mt-3 mb-4 text-xs text-muted">{data.maps.length} of {limit} active maps on your plan.</p>}
      {!data ? <PageSkeleton /> : !data.maps.length ? (
        <EmptyState icon={<Workflow className="size-6" />} title={tab === "active" ? "No mind maps yet" : "No archived maps"}
          body="Start from a blank canvas or a template like “Personal development” to see how your goals connect."
          action={tab === "active" && <Button variant="primary" onClick={() => openCreate("map")}><Plus className="size-4" /> Create your first map</Button>} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {data.maps.map((m) => (
            <Card key={m.id} className="group relative overflow-hidden transition-shadow hover:shadow-card">
              <Link href={`/maps/${m.id}`} className="block">
                <MapThumb seed={m.id} nodes={m._count.nodes} />
                <div className="p-4">
                  <p className="flex items-center gap-1.5 font-semibold">{m.favorite && <Star className="size-3.5 fill-amber-400 text-amber-400" />}{m.title}</p>
                  {m.description && <p className="mt-0.5 line-clamp-1 text-sm text-muted">{m.description}</p>}
                  <p className="mt-2 text-xs text-muted">{m._count.nodes} nodes · {m._count.edges} connections · {m.folder ? `${m.folder.icon} ${m.folder.name} · ` : ""}edited {ago(m.updatedAt)}</p>
                </div>
              </Link>
              <div className="absolute right-2 top-2">
                <Popover align="end" trigger={({ toggle }) => <Button variant="secondary" size="icon-sm" onClick={toggle} aria-label="Map actions"><MoreHorizontal className="size-4" /></Button>}>
                  {(close) => (
                    <>
                      <MenuItem icon={<Star />} onClick={() => { close(); act(() => patch(`/api/maps/${m.id}`, { favorite: !m.favorite }), m.favorite ? "Removed from favorites" : "Added to favorites"); }}>{m.favorite ? "Unfavorite" : "Favorite"}</MenuItem>
                      <MenuItem icon={<Copy />} onClick={() => { close(); act(() => post(`/api/maps/${m.id}/duplicate`), "Map duplicated"); }}>Duplicate</MenuItem>
                      {tab === "active" ? (
                        <MenuItem icon={<Archive />} onClick={() => { close(); act(() => patch(`/api/maps/${m.id}`, { archived: true }), "Map archived"); }}>Archive</MenuItem>
                      ) : (
                        <MenuItem icon={<ArchiveRestore />} onClick={() => { close(); act(() => patch(`/api/maps/${m.id}`, { archived: false }), "Map restored"); }}>Restore</MenuItem>
                      )}
                      <MenuSeparator />
                      <MenuItem icon={<Trash2 />} danger onClick={async () => {
                        close();
                        if (await confirm({ title: `Delete “${m.title}”?`, body: "The map, its nodes and connections are deleted permanently. Linked tasks, goals and notes are kept.", confirmLabel: "Delete map", danger: true }))
                          act(() => del(`/api/maps/${m.id}`), "Map deleted");
                      }}>Delete</MenuItem>
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

/** Decorative, deterministic mini-graph per map. */
function MapThumb({ seed, nodes }: { seed: string; nodes: number }) {
  let h = 0;
  for (const c of seed) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const rnd = () => ((h = (h * 1103515245 + 12345) >>> 0) / 2 ** 32);
  const n = Math.min(9, Math.max(3, nodes));
  const pts = Array.from({ length: n }, (_, i) => (i === 0 ? [150, 60] : [30 + rnd() * 240, 18 + rnd() * 84]));
  const colors = ["#6366f1", "#10b981", "#f59e0b", "#ec4899", "#3b82f6", "#8b5cf6"];
  return (
    <svg viewBox="0 0 300 120" className="h-28 w-full bg-surface-2/70" aria-hidden>
      {pts.slice(1).map(([x, y], i) => <path key={i} d={`M150 60 Q ${(150 + x) / 2} ${y < 60 ? y - 10 : y + 10} ${x} ${y}`} fill="none" stroke="var(--border-strong)" strokeWidth="1.5" />)}
      {pts.map(([x, y], i) => <rect key={i} x={x - (i ? 14 : 22)} y={y - 6} width={i ? 28 : 44} height="12" rx="6" fill={i ? "var(--surface)" : colors[0]} stroke={colors[i % colors.length]} strokeWidth="1.5" />)}
    </svg>
  );
}
