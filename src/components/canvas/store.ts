"use client";
import { createStore } from "zustand/vanilla";
import { applyEdgeChanges, applyNodeChanges, type EdgeChange, type NodeChange, type Viewport } from "@xyflow/react";
import type { MindNode, MindNodeData, RelationEdge, RelationEdgeData } from "./types";

type Snapshot = { nodes: MindNode[]; edges: RelationEdge[] };

export interface MapState {
  nodes: MindNode[];
  edges: RelationEdge[];
  past: Snapshot[];
  future: Snapshot[];
  /** Incremented on every persisted change; the autosaver watches it. */
  version: number;
  viewport: Viewport | null;
  editingId: string | null;
  /** Card whose text (description) is being edited right on the canvas. */
  editingTextId: string | null;
  search: string;
  set: (fn: (s: MapState) => Partial<MapState>) => void;
  checkpoint: () => void;
  onNodesChange: (changes: NodeChange<MindNode>[]) => void;
  onEdgesChange: (changes: EdgeChange<RelationEdge>[]) => void;
  /** Applies a structural change with an undo checkpoint. */
  commit: (fn: (s: Snapshot) => Partial<Snapshot>) => void;
  updateNode: (id: string, data: Partial<MindNodeData>, opts?: { checkpoint?: boolean }) => void;
  updateEdge: (id: string, data: Partial<RelationEdgeData>) => void;
  undo: () => void;
  redo: () => void;
  reset: (nodes: MindNode[], edges: RelationEdge[]) => void;
}

const LIMIT = 100;
const strip = (n: MindNode[]) => n.map((x) => ({ ...x, selected: false, dragging: false }));

export const createMapStore = (nodes: MindNode[], edges: RelationEdge[], viewport: Viewport | null) =>
  createStore<MapState>((set, get) => ({
    nodes,
    edges,
    past: [],
    future: [],
    version: 0,
    viewport,
    editingId: null,
    editingTextId: null,
    search: "",
    set: (fn) => set(fn(get())),
    checkpoint: () => {
      const { nodes, edges, past } = get();
      set({ past: [...past.slice(-LIMIT + 1), { nodes: strip(nodes), edges }], future: [] });
    },
    onNodesChange: (changes) => {
      const persist = changes.some(
        (c) => (c.type === "position" && !c.dragging) || c.type === "remove" || c.type === "add" || (c.type === "dimensions" && c.resizing === false),
      );
      if (changes.some((c) => c.type === "remove")) get().checkpoint();
      set((s) => ({ nodes: applyNodeChanges(changes, s.nodes), version: persist ? s.version + 1 : s.version }));
    },
    onEdgesChange: (changes) => {
      if (changes.some((c) => c.type === "remove")) get().checkpoint();
      const persist = changes.some((c) => c.type === "remove" || c.type === "add");
      set((s) => ({ edges: applyEdgeChanges(changes, s.edges), version: persist ? s.version + 1 : s.version }));
    },
    commit: (fn) => {
      get().checkpoint();
      const s = get();
      const next = fn({ nodes: s.nodes, edges: s.edges });
      set({ ...next, version: s.version + 1 });
    },
    updateNode: (id, data, opts = {}) => {
      if (opts.checkpoint !== false) get().checkpoint();
      set((s) => ({ nodes: s.nodes.map((n) => (n.id === id ? { ...n, data: { ...n.data, ...data } } : n)), version: s.version + 1 }));
    },
    updateEdge: (id, data) => {
      get().checkpoint();
      set((s) => ({ edges: s.edges.map((e) => (e.id === id ? { ...e, data: { ...(e.data as RelationEdgeData), ...data } } : e)), version: s.version + 1 }));
    },
    undo: () => {
      const { past, future, nodes, edges, version } = get();
      const prev = past[past.length - 1];
      if (!prev) return;
      set({ nodes: prev.nodes, edges: prev.edges, past: past.slice(0, -1), future: [{ nodes: strip(nodes), edges }, ...future].slice(0, LIMIT), version: version + 1 });
    },
    redo: () => {
      const { past, future, nodes, edges, version } = get();
      const next = future[0];
      if (!next) return;
      set({ nodes: next.nodes, edges: next.edges, future: future.slice(1), past: [...past, { nodes: strip(nodes), edges }], version: version + 1 });
    },
    reset: (nodes, edges) => set({ nodes, edges, past: [], future: [] }),
  }));

export type MapStore = ReturnType<typeof createMapStore>;
