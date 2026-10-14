"use client";
import { toEdgeInputs, toNodeInputs } from "./serialize";
import type { MindNode, RelationEdge } from "./types";

/**
 * A copy of unsaved map edits kept on this device, so a crash, a closed tab or a failed
 * save never loses work: the next time the map opens, the editor offers to restore it.
 */
export interface MapDraft {
  /** Map revision the edits were made on top of. */
  base: number;
  at: number;
  nodes: MindNode[];
  edges: RelationEdge[];
}

const key = (mapId: string) => `nodera:map-draft:${mapId}`;

// Storage can be full, disabled or unavailable (private mode) — drafts are best-effort.
export function readDraft(mapId: string): MapDraft | null {
  try {
    const raw = localStorage.getItem(key(mapId));
    if (!raw) return null;
    const d = JSON.parse(raw) as MapDraft;
    return Array.isArray(d?.nodes) && Array.isArray(d.edges) && typeof d.base === "number" ? d : null;
  } catch {
    return null;
  }
}

export function writeDraft(mapId: string, base: number, nodes: MindNode[], edges: RelationEdge[]) {
  const clean: MapDraft = {
    base,
    at: Date.now(),
    nodes: nodes.map(({ id, type, position, parentId, width, height, zIndex, data }) => ({
      id, type, position, data,
      ...(parentId ? { parentId } : {}),
      ...(type === "group" ? { width, height, zIndex } : {}),
    })),
    edges: edges.map(({ id, source, target, sourceHandle, targetHandle, type, data }) => ({ id, source, target, sourceHandle, targetHandle, type, data })),
  };
  try { localStorage.setItem(key(mapId), JSON.stringify(clean)); } catch { /* best-effort */ }
}

export function clearDraft(mapId: string) {
  try { localStorage.removeItem(key(mapId)); } catch { /* best-effort */ }
}

const canonical = (nodes: MindNode[], edges: RelationEdge[]) => JSON.stringify([
  toNodeInputs(nodes).sort((a, b) => a.id.localeCompare(b.id)),
  toEdgeInputs(edges).sort((a, b) => a.id.localeCompare(b.id)),
]);

/** True when the draft holds nothing that isn't already on the server. */
export function sameGraph(draft: Pick<MapDraft, "nodes" | "edges">, nodes: MindNode[], edges: RelationEdge[]) {
  try {
    return canonical(draft.nodes, draft.edges) === canonical(nodes, edges);
  } catch {
    return false;
  }
}
