"use client";
import { useRouter } from "next/navigation";
import { Workflow } from "lucide-react";
import { post, useApi } from "@/lib/client/api";
import { toast } from "@/lib/client/store";
import type { MapSummary } from "@/lib/client/types";
import { Button } from "@/components/ui/button";
import { MenuItem, Popover } from "@/components/ui/misc";

/** "Show on a mind map": places an existing entity onto a chosen map as a linked node. */
export function PlaceOnMap({ type, id, size = "sm", label = "Add to map" }: { type: "note" | "task" | "goal" | "project" | "habit"; id: string; size?: "sm" | "xs"; label?: string }) {
  const router = useRouter();
  return (
    <Popover align="end" className="w-64" trigger={({ toggle }) => <Button size={size} variant="ghost" onClick={toggle}><Workflow className="size-3.5" /> {label}</Button>}>
      {(close) => <MapList onPick={async (mapId) => {
        close();
        try {
          const r = await post<{ nodeId: string; existed: boolean }>(`/api/maps/${mapId}/place`, { type, id });
          router.push(`/maps/${mapId}?node=${r.nodeId}`);
          if (r.existed) toast.info("Already on that map — showing it");
        } catch (e) { toast.error(e); }
      }} />}
    </Popover>
  );
}

function MapList({ onPick }: { onPick: (id: string) => void }) {
  const { data } = useApi<{ maps: MapSummary[] }>("/api/maps");
  if (!data) return <p className="p-3 text-sm text-muted">Loading…</p>;
  if (!data.maps.length) return <p className="p-3 text-sm text-muted">Create a mind map first.</p>;
  return (
    <>
      <p className="px-2.5 pt-1.5 pb-1 text-[11px] font-medium uppercase tracking-wide text-muted">Place on map</p>
      {data.maps.map((m) => <MenuItem key={m.id} icon={<Workflow />} onClick={() => onPick(m.id)}>{m.title}</MenuItem>)}
    </>
  );
}
