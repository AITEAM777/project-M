"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useStore } from "zustand";
import {
  Background, BackgroundVariant, ConnectionMode, Controls, MiniMap, ReactFlow, ReactFlowProvider, SelectionMode, useReactFlow,
  type Connection, type FinalConnectionState, type OnConnectEnd, type Viewport,
} from "@xyflow/react";
import {
  ArrowLeft, BoxSelect, Check, ChevronDown, CloudOff, Group, LayoutGrid, Loader2, Map as MapIcon, MoreHorizontal, Plus, Redo2, Search,
  Undo2, Ungroup, Waves, X,
} from "lucide-react";
import { api, invalidate, patch, post, put, useApi } from "@/lib/client/api";
import { confirm, toast } from "@/lib/client/store";
import { useMe, useMediaQuery } from "@/lib/client/hooks";
import { cn, uid } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Kbd, MenuItem, MenuSeparator, Popover, Spinner, Tooltip } from "@/components/ui/misc";
import { MapCtx, type MapActions } from "./context";
import { edgeTypes } from "./edges";
import { nodeTypes } from "./nodes";
import { EdgePanel, LegendPanel, NodePanel, type PanelActions } from "./panels";
import { computeHidden, autoLayout } from "./graph-utils";
import { createMapStore, type MapStore } from "./store";
import { decorateEdge, decorateNode, sortParentsFirst, toEdgeInputs, toFlowEdges, toFlowNodes, toNodeInputs, type ApiEdge, type ApiNode } from "./serialize";
import { KIND_META, RELATION_META, type MindNode, type NodeKind, type Relation, type RelationEdge } from "./types";
import { AiSummaryButton } from "./ai-summary";

interface MapResponse {
  map: { id: string; title: string; description: string; viewport: Viewport | null; workspaceId: string; folder: { id: string; name: string; icon: string } | null };
  nodes: ApiNode[];
  edges: ApiEdge[];
}

type SaveState = "saved" | "dirty" | "saving" | "error";

export function MapEditor({ mapId }: { mapId: string }) {
  const { data, error } = useApi<MapResponse>(`/api/maps/${mapId}`, { revalidateOnFocus: false, revalidateIfStale: false, keepPreviousData: false });
  if (error) return <div className="grid h-full place-items-center p-6 text-center text-sm text-muted">Could not open this map: {error.message}<br /><Link href="/maps" className="mt-2 text-accent">Back to maps</Link></div>;
  if (!data || data.map.id !== mapId) return <div className="grid h-full place-items-center"><Spinner className="size-7" /></div>;
  return (
    <ReactFlowProvider>
      <Editor key={mapId} initial={data} />
    </ReactFlowProvider>
  );
}

function absPosition(n: MindNode, nodes: MindNode[]) {
  if (!n.parentId) return n.position;
  const p = nodes.find((x) => x.id === n.parentId);
  return p ? { x: p.position.x + n.position.x, y: p.position.y + n.position.y } : n.position;
}

function newNode(id: string, position: { x: number; y: number }, kind: NodeKind = "THOUGHT", title = ""): MindNode {
  return {
    id, type: "mind", position, selected: true,
    data: { kind, title, description: "", color: "", shape: "rounded", icon: "", tags: [], links: [], collapsed: false, noteId: null, taskId: null, goalId: null, projectId: null, habitId: null, attachmentCount: 0 },
  };
}

function Editor({ initial }: { initial: MapResponse }) {
  const mapId = initial.map.id;
  const router = useRouter();
  const params = useSearchParams();
  const rf = useReactFlow<MindNode, RelationEdge>();
  const { data: me } = useMe();
  const aiOn = !!(me?.aiAvailable && me.user.aiEnabled);
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const [store] = useState<MapStore>(() => createMapStore(toFlowNodes(initial.nodes), toFlowEdges(initial.edges), initial.map.viewport));
  const nodes = useStore(store, (s) => s.nodes);
  const edges = useStore(store, (s) => s.edges);
  const search = useStore(store, (s) => s.search);
  const canUndo = useStore(store, (s) => s.past.length > 0);
  const canRedo = useStore(store, (s) => s.future.length > 0);
  const [title, setTitle] = useState(initial.map.title);
  const [saveState, setSaveState] = useState<SaveState>("saved");
  const [defaultRelation, setDefaultRelation] = useState<Relation>("RELATED_TO");
  const [showMinimap, setShowMinimap] = useState(true);
  const [animate, setAnimate] = useState(true);
  const [panelOpen, setPanelOpen] = useState(true);
  const [searchOpen, setSearchOpen] = useState(false);
  const [matchIdx, setMatchIdx] = useState(0);
  const wrapper = useRef<HTMLDivElement>(null);
  const searchInput = useRef<HTMLInputElement>(null);

  /* ---------------- persistence ---------------- */
  const saving = useRef<Promise<void> | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dirty = useRef(false);
  const retry = useRef(0);

  const saveNow = useCallback(async (): Promise<void> => {
    if (saving.current) { await saving.current; if (!dirty.current) return; }
    if (!dirty.current) return;
    dirty.current = false;
    const { nodes, edges } = store.getState();
    setSaveState("saving");
    const p = put(`/api/maps/${mapId}/graph`, { nodes: toNodeInputs(nodes), edges: toEdgeInputs(edges) })
      .then(() => {
        retry.current = 0;
        setSaveState(dirty.current ? "dirty" : "saved");
      })
      .catch((e: { status?: number; message?: string }) => {
        dirty.current = true;
        setSaveState("error");
        if (e.status && e.status >= 400 && e.status < 500 && e.status !== 408 && e.status !== 429) {
          toast.error(e);
        } else {
          const delay = Math.min(30_000, 2000 * 2 ** retry.current++);
          timer.current = setTimeout(() => void saveNow(), delay);
        }
      })
      .finally(() => { saving.current = null; });
    saving.current = p;
    await p;
  }, [mapId, store]);

  const flush = useCallback(async () => {
    if (timer.current) clearTimeout(timer.current);
    await saveNow();
  }, [saveNow]);

  useEffect(() => {
    const unsub = store.subscribe((s, prev) => {
      if (s.version === prev.version) return;
      dirty.current = true;
      setSaveState("dirty");
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => void saveNow(), 700);
    });
    const beforeUnload = (e: BeforeUnloadEvent) => { if (dirty.current) { e.preventDefault(); } };
    window.addEventListener("beforeunload", beforeUnload);
    return () => {
      unsub();
      window.removeEventListener("beforeunload", beforeUnload);
      if (timer.current) clearTimeout(timer.current);
      if (dirty.current) {
        const { nodes, edges } = store.getState();
        // Best-effort flush when navigating away inside the app.
        fetch(`/api/maps/${mapId}/graph`, { method: "PUT", keepalive: true, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ nodes: toNodeInputs(nodes), edges: toEdgeInputs(edges) }) }).catch(() => {});
      }
      invalidate("/api/maps", "/api/dashboard");
    };
  }, [store, saveNow, mapId]);

  const vpTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onMoveEnd = useCallback((_: unknown, vp: Viewport) => {
    if (vpTimer.current) clearTimeout(vpTimer.current);
    vpTimer.current = setTimeout(() => patch(`/api/maps/${mapId}`, { viewport: vp }).catch(() => {}), 1500);
  }, [mapId]);

  const titleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const changeTitle = (t: string) => {
    setTitle(t);
    if (titleTimer.current) clearTimeout(titleTimer.current);
    if (t.trim()) titleTimer.current = setTimeout(() => patch(`/api/maps/${mapId}`, { title: t.trim() }).then(() => invalidate("/api/maps")).catch(toast.error), 600);
  };

  /** Re-reads linked-entity snapshots (task status, goal progress…) from the server. */
  const refreshLinked = useCallback(async () => {
    const fresh = await api<MapResponse>(`/api/maps/${mapId}`);
    const byId = new Map(fresh.nodes.map((n) => [n.id, n]));
    store.getState().set((s) => ({
      nodes: s.nodes.map((n) => {
        const f = byId.get(n.id);
        if (!f) return n;
        return { ...n, data: { ...n.data, linked: f.linked, title: f.title, kind: f.kind, noteId: f.noteId, taskId: f.taskId, goalId: f.goalId, projectId: f.projectId, habitId: f.habitId, attachmentCount: f.attachmentCount } };
      }),
    }));
  }, [mapId, store]);

  /* ---------------- selection helpers ---------------- */
  const selectNode = useCallback((id: string, center = true) => {
    store.getState().set((s) => ({ nodes: s.nodes.map((n) => (n.selected === (n.id === id) ? n : { ...n, selected: n.id === id })), edges: s.edges.map((e) => (e.selected ? { ...e, selected: false } : e)) }));
    const n = store.getState().nodes.find((x) => x.id === id);
    if (n && center) {
      const p = absPosition(n, store.getState().nodes);
      rf.setCenter(p.x + (n.measured?.width ?? 220) / 2, p.y + (n.measured?.height ?? 60) / 2, { zoom: Math.max(rf.getZoom(), 1), duration: 400 });
    }
    setPanelOpen(true);
  }, [rf, store]);

  useEffect(() => {
    const focus = params.get("node");
    if (focus && store.getState().nodes.some((n) => n.id === focus)) setTimeout(() => selectNode(focus), 120);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---------------- mutations ---------------- */
  const createNodeAt = useCallback((position: { x: number; y: number }, opts: { kind?: NodeKind; from?: string; title?: string; relation?: Relation } = {}) => {
    const id = uid("n_");
    store.getState().commit((s) => ({
      nodes: [...s.nodes.map((n) => (n.selected ? { ...n, selected: false } : n)), newNode(id, position, opts.kind, opts.title)],
      edges: opts.from ? [...s.edges, { id: uid("e_"), source: opts.from, target: id, type: "relation", data: { relation: opts.relation ?? defaultRelation, label: "", description: "", bidirectional: false } }] : s.edges,
    }));
    store.getState().set(() => ({ editingId: id }));
    setPanelOpen(true);
    return id;
  }, [store, defaultRelation]);

  const addChild = useCallback((parentId: string) => {
    const s = store.getState();
    const parent = s.nodes.find((n) => n.id === parentId);
    if (!parent) return;
    const p = absPosition(parent, s.nodes);
    const kids = s.edges.filter((e) => e.source === parentId).map((e) => s.nodes.find((n) => n.id === e.target)).filter(Boolean) as MindNode[];
    const maxY = kids.length ? Math.max(...kids.map((k) => absPosition(k, s.nodes).y)) + 100 : p.y;
    const id = createNodeAt({ x: p.x + 300, y: maxY }, { from: parentId });
    if (parent.data.collapsed) s.updateNode(parentId, { collapsed: false }, { checkpoint: false });
    return id;
  }, [store, createNodeAt]);

  const addSibling = useCallback((id: string) => {
    const s = store.getState();
    const inc = s.edges.find((e) => e.target === id);
    if (inc) return addChild(inc.source);
    const n = s.nodes.find((x) => x.id === id);
    if (n) createNodeAt({ x: absPosition(n, s.nodes).x, y: absPosition(n, s.nodes).y + 110 });
  }, [store, addChild, createNodeAt]);

  const remove = useCallback((ids: string[], edgeIds: string[] = []) => {
    if (!ids.length && !edgeIds.length) return;
    const idSet = new Set(ids);
    store.getState().commit((s) => {
      const groups = s.nodes.filter((n) => idSet.has(n.id) && n.type === "group");
      const gpos = new Map(groups.map((g) => [g.id, g.position]));
      return {
        nodes: s.nodes.filter((n) => !idSet.has(n.id)).map((n) => {
          const gp = n.parentId ? gpos.get(n.parentId) : undefined;
          if (!gp) return n;
          const { parentId, extent, ...rest } = n;
          return { ...rest, position: { x: n.position.x + gp.x, y: n.position.y + gp.y } };
        }),
        edges: s.edges.filter((e) => !edgeIds.includes(e.id) && !idSet.has(e.source) && !idSet.has(e.target)),
      };
    });
    const what = ids.length ? `${ids.length} node${ids.length > 1 ? "s" : ""}` : `${edgeIds.length} connection${edgeIds.length > 1 ? "s" : ""}`;
    toast.info(`Deleted ${what}`, { label: "Undo", run: () => store.getState().undo() });
  }, [store]);

  const duplicate = useCallback((ids: string[]) => {
    const s = store.getState();
    const src = s.nodes.filter((n) => ids.includes(n.id) && n.type !== "group");
    if (!src.length) return;
    const map = new Map(src.map((n) => [n.id, uid("n_")]));
    const copies: MindNode[] = src.map((n) => {
      const p = absPosition(n, s.nodes);
      return {
        id: map.get(n.id)!, type: "mind", position: { x: p.x + 40, y: p.y + 40 }, selected: true,
        data: { ...n.data, title: n.data.title, noteId: null, taskId: null, goalId: null, projectId: null, habitId: null, linked: undefined, attachmentCount: 0, collapsed: false },
      };
    });
    const copyEdges = s.edges.filter((e) => map.has(e.source) && map.has(e.target)).map((e) => ({ ...e, id: uid("e_"), source: map.get(e.source)!, target: map.get(e.target)!, selected: false }));
    s.commit((st) => ({ nodes: [...st.nodes.map((n) => (n.selected ? { ...n, selected: false } : n)), ...copies], edges: [...st.edges, ...copyEdges] }));
  }, [store]);

  const groupSelection = useCallback(() => {
    const s = store.getState();
    const sel = s.nodes.filter((n) => n.selected && !n.parentId && n.type !== "group");
    if (!sel.length) return toast.info("Select nodes to group (shift-drag to box-select)");
    const xs = sel.map((n) => n.position.x), ys = sel.map((n) => n.position.y);
    const x2 = sel.map((n) => n.position.x + (n.measured?.width ?? 220)), y2 = sel.map((n) => n.position.y + (n.measured?.height ?? 64));
    const gx = Math.min(...xs) - 28, gy = Math.min(...ys) - 44;
    const gid = uid("n_");
    const group: MindNode = {
      id: gid, type: "group", position: { x: gx, y: gy }, width: Math.max(...x2) - gx + 28, height: Math.max(...y2) - gy + 28, zIndex: -1,
      data: { ...newNode(gid, { x: 0, y: 0 }).data, kind: "GROUP", title: "Group" },
    };
    const selIds = new Set(sel.map((n) => n.id));
    s.commit((st) => ({
      nodes: sortParentsFirst([group, ...st.nodes.map((n) => (selIds.has(n.id) ? { ...n, parentId: gid, selected: false, position: { x: n.position.x - gx, y: n.position.y - gy } } : n))]),
    }));
    store.getState().set(() => ({ editingId: gid }));
  }, [store]);

  const ungroup = useCallback((gid: string) => {
    const s = store.getState();
    const g = s.nodes.find((n) => n.id === gid);
    if (!g) return;
    s.commit((st) => ({
      nodes: st.nodes.filter((n) => n.id !== gid).map((n) => {
        if (n.parentId !== gid) return n;
        const { parentId, ...rest } = n;
        return { ...rest, position: { x: n.position.x + g.position.x, y: n.position.y + g.position.y } };
      }),
    }));
  }, [store]);

  const layout = useCallback((dir: "LR" | "TB") => {
    store.getState().commit((s) => ({ nodes: autoLayout(s.nodes, s.edges, dir) }));
    setTimeout(() => rf.fitView({ duration: 500, padding: 0.15 }), 50);
  }, [store, rf]);

  const setTaskStatus = useCallback(async (nodeId: string, status: string) => {
    const n = store.getState().nodes.find((x) => x.id === nodeId);
    const task = n?.data.linked?.task;
    if (!n || !task) return;
    const apply = (st: string) => store.getState().set((s) => ({ nodes: s.nodes.map((x) => (x.id === nodeId && x.data.linked?.task ? { ...x, data: { ...x.data, linked: { ...x.data.linked, task: { ...x.data.linked.task, status: st } } } } : x)) }));
    apply(status);
    try {
      await patch(`/api/tasks/${task.id}`, { status });
      invalidate("/api/tasks", "/api/dashboard", "/api/goals");
      if (status === "DONE") toast.success(`Completed “${task.title}”`);
      refreshLinked().catch(() => {});
    } catch (e) { apply(task.status); toast.error(e); }
  }, [store, refreshLinked]);

  const actions: MapActions = useMemo(() => ({
    toggleTask: (id) => {
      const st = store.getState().nodes.find((x) => x.id === id)?.data.linked?.task?.status;
      void setTaskStatus(id, st === "DONE" ? "TODO" : "DONE");
    },
    toggleCollapse: (id) => {
      const n = store.getState().nodes.find((x) => x.id === id);
      if (n) store.getState().updateNode(id, { collapsed: !n.data.collapsed });
    },
    addChild: (id) => void addChild(id),
    finishEdit: (id, value) => {
      const s = store.getState();
      const n = s.nodes.find((x) => x.id === id);
      if (n && value !== null && value.trim() !== n.data.title) s.updateNode(id, { title: value.trim() });
      s.set(() => ({ editingId: null }));
      wrapper.current?.focus();
    },
  }), [store, addChild, setTaskStatus]);

  const panelActions: PanelActions = useMemo(() => ({
    convert: async (nodeId, to, extra) => {
      try {
        await flush();
        await post(`/api/maps/${mapId}/nodes/${nodeId}/convert`, { to, ...extra });
        await refreshLinked();
        invalidate("/api/tasks", "/api/goals", "/api/projects", "/api/habits", "/api/notes", "/api/dashboard");
        toast.success({ TASK: "Turned into a task", NOTE: "Note created", GOAL: "Turned into a goal", PROJECT: "Turned into a project", HABIT: "Turned into a habit" }[to]);
      } catch (e) { toast.error(e); }
    },
    duplicate,
    remove: (ids) => remove(ids),
    moveToMap: async (nodeId, target) => {
      try {
        await flush();
        await post(`/api/maps/${mapId}/nodes/${nodeId}/move`, { targetMapId: target });
        store.getState().reset(store.getState().nodes.filter((n) => n.id !== nodeId), store.getState().edges.filter((e) => e.source !== nodeId && e.target !== nodeId));
        toast.success("Node moved", { label: "Open map", run: () => router.push(`/maps/${target}?node=${nodeId}`) });
      } catch (e) { toast.error(e); }
    },
    select: (id) => selectNode(id),
    flush,
    setTaskStatus,
  }), [duplicate, remove, flush, mapId, refreshLinked, store, router, selectNode, setTaskStatus]);

  /* ---------------- React Flow handlers ---------------- */
  const onConnect = useCallback((c: Connection) => {
    if (c.source === c.target) return;
    const s = store.getState();
    if (s.edges.some((e) => (e.source === c.source && e.target === c.target) || (e.source === c.target && e.target === c.source))) return toast.info("These nodes are already connected");
    s.commit((st) => ({ edges: [...st.edges, { id: uid("e_"), source: c.source, target: c.target, sourceHandle: c.sourceHandle ?? undefined, targetHandle: c.targetHandle ?? undefined, type: "relation", data: { relation: defaultRelation, label: "", description: "", bidirectional: false } }] }));
  }, [store, defaultRelation]);

  const onConnectEnd: OnConnectEnd = useCallback((event, state: FinalConnectionState) => {
    if (state.isValid || !state.fromNode) return;
    const pt = "changedTouches" in event ? event.changedTouches[0] : (event as MouseEvent);
    const pos = rf.screenToFlowPosition({ x: pt.clientX, y: pt.clientY });
    createNodeAt({ x: pos.x - 110, y: pos.y - 24 }, { from: state.fromNode.id });
  }, [rf, createNodeAt]);

  const onPaneDoubleClick = (e: React.MouseEvent) => {
    if (!(e.target as HTMLElement).classList.contains("react-flow__pane")) return;
    const pos = rf.screenToFlowPosition({ x: e.clientX, y: e.clientY });
    createNodeAt({ x: pos.x - 110, y: pos.y - 24 });
  };

  /* ---------------- search ---------------- */
  const matches = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return [] as string[];
    return nodes.filter((n) => n.data.title.toLowerCase().includes(q) || n.data.description.toLowerCase().includes(q) || n.data.tags.some((t) => t.includes(q.replace(/^#/, "")))).map((n) => n.id);
  }, [nodes, search]);
  const gotoMatch = (dir: 1 | -1) => {
    if (!matches.length) return;
    const i = (matchIdx + dir + matches.length) % matches.length;
    setMatchIdx(i);
    selectNode(matches[i]);
  };

  /* ---------------- keyboard ---------------- */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName)) return;
      if (document.querySelector('[role="dialog"]')) return;
      const s = store.getState();
      const mod = e.metaKey || e.ctrlKey;
      const selNodes = s.nodes.filter((n) => n.selected);
      const selEdges = s.edges.filter((x) => x.selected);
      const k = e.key.toLowerCase();
      if (mod && k === "z") { e.preventDefault(); if (e.shiftKey) s.redo(); else s.undo(); return; }
      if (mod && k === "y") { e.preventDefault(); s.redo(); return; }
      if (mod && k === "f") { e.preventDefault(); setSearchOpen(true); setTimeout(() => searchInput.current?.focus(), 10); return; }
      if (mod && k === "d") { e.preventDefault(); duplicate(selNodes.map((n) => n.id)); return; }
      if (mod && k === "a") { e.preventDefault(); s.set((st) => ({ nodes: st.nodes.map((n) => ({ ...n, selected: !n.hidden })) })); return; }
      if (mod && k === "g") { e.preventDefault(); if (e.shiftKey) selNodes.filter((n) => n.type === "group").forEach((g) => ungroup(g.id)); else groupSelection(); return; }
      if (mod && k === "s") { e.preventDefault(); void flush(); return; }
      if (e.key === "Delete" || e.key === "Backspace") { if (selNodes.length || selEdges.length) { e.preventDefault(); remove(selNodes.map((n) => n.id), selEdges.map((x) => x.id)); } return; }
      if (selNodes.length === 1) {
        const n = selNodes[0];
        if (e.key === "Tab") { e.preventDefault(); addChild(n.id); return; }
        if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); addSibling(n.id); return; }
        if (e.key === "F2" || (e.key === "Enter" && e.shiftKey)) { e.preventDefault(); s.set(() => ({ editingId: n.id })); return; }
        if (e.key === " " ) { e.preventDefault(); actions.toggleCollapse(n.id); return; }
      }
      if (e.key === "Escape") s.set((st) => ({ nodes: st.nodes.map((n) => (n.selected ? { ...n, selected: false } : n)), edges: st.edges.map((x) => (x.selected ? { ...x, selected: false } : x)) }));
      if (!mod && k === "n") { e.preventDefault(); const c = rf.screenToFlowPosition({ x: window.innerWidth / 2, y: window.innerHeight / 2 }); createNodeAt({ x: c.x - 110, y: c.y - 24 }); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [store, duplicate, ungroup, groupSelection, flush, remove, addChild, addSibling, actions, rf, createNodeAt]);

  /* ---------------- derived render state ---------------- */
  const collapsedKey = nodes.filter((n) => n.data.collapsed).map((n) => n.id).join(",");
  const { hidden, counts } = useMemo(() => computeHidden(store.getState().nodes, edges),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [collapsedKey, edges]);
  const matchSet = useMemo(() => new Set(matches), [matches]);
  const parents = useMemo(() => new Set(edges.map((e) => e.source)), [edges]);
  const viewNodes = useMemo(() => nodes.map((n) => decorateNode(n, hidden.has(n.id), matchSet.has(n.id), counts.get(n.id) ?? 0, parents.has(n.id))), [nodes, hidden, matchSet, counts, parents]);
  const viewEdges = useMemo(() => edges.map((e) => decorateEdge(e, hidden.has(e.source) || hidden.has(e.target), animate && nodes.length < 400)), [edges, hidden, animate, nodes.length]);

  const selectedNodes = nodes.filter((n) => n.selected);
  const selectedEdges = edges.filter((e) => e.selected);
  const single = selectedNodes.length === 1 && !selectedEdges.length ? selectedNodes[0] : null;
  const singleEdge = selectedEdges.length === 1 && !selectedNodes.length ? selectedEdges[0] : null;
  const showPanel = panelOpen && (single || singleEdge);

  const ctx = useMemo(() => ({ store, mapId, actions, readOnly: false }), [store, mapId, actions]);

  return (
    <MapCtx.Provider value={ctx}>
      <div ref={wrapper} tabIndex={-1} className="absolute inset-0 outline-none" onDoubleClick={onPaneDoubleClick}>
        <ReactFlow<MindNode, RelationEdge>
          nodes={viewNodes}
          edges={viewEdges}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          onNodesChange={store.getState().onNodesChange}
          onEdgesChange={store.getState().onEdgesChange}
          onNodeDragStart={() => store.getState().checkpoint()}
          onSelectionDragStart={() => store.getState().checkpoint()}
          onConnect={onConnect}
          onConnectEnd={onConnectEnd}
          onNodeDoubleClick={(_, n) => store.getState().set(() => ({ editingId: n.id }))}
          onNodeClick={() => setPanelOpen(true)}
          onEdgeClick={() => setPanelOpen(true)}
          onMoveEnd={onMoveEnd}
          defaultViewport={initial.map.viewport ?? undefined}
          fitView={!initial.map.viewport}
          fitViewOptions={{ padding: 0.2, maxZoom: 1.1 }}
          connectionMode={ConnectionMode.Loose}
          deleteKeyCode={null}
          selectionKeyCode="Shift"
          multiSelectionKeyCode={["Meta", "Control", "Shift"]}
          selectionMode={SelectionMode.Partial}
          zoomOnDoubleClick={false}
          minZoom={0.08}
          maxZoom={2.5}
          onlyRenderVisibleElements={nodes.length > 150}
          proOptions={{ hideAttribution: true }}
          className={cn(search && "searching")}
        >
          <Background variant={BackgroundVariant.Dots} gap={22} size={1.4} color="var(--canvas-dot)" />
          <Controls position="bottom-left" showInteractive={false} />
          {showMinimap && isDesktop && (
            <MiniMap position="bottom-right" pannable zoomable maskColor="rgba(120,120,140,0.12)" nodeStrokeWidth={2}
              nodeColor={(n) => (n as MindNode).data.color || KIND_META[(n as MindNode).data.kind]?.color || "#999"} style={showPanel ? { right: 352 } : undefined} />
          )}
        </ReactFlow>

        {/* Top toolbar */}
        <div className="pointer-events-none absolute inset-x-0 top-0 flex flex-wrap items-start gap-2 p-3">
          <div className="pointer-events-auto flex items-center gap-1 rounded-xl border border-border bg-surface/95 p-1 shadow-card backdrop-blur">
            <Link href="/maps" className="grid size-8 place-items-center rounded-lg text-muted hover:bg-surface-2 hover:text-text" aria-label="Back to maps"><ArrowLeft className="size-4" /></Link>
            <input value={title} onChange={(e) => changeTitle(e.target.value)} className="w-36 sm:w-56 rounded-md bg-transparent px-1.5 py-1 text-sm font-semibold outline-none hover:bg-surface-2 focus:bg-surface-2" aria-label="Map title" />
            <SaveIndicator state={saveState} onRetry={() => void flush()} />
          </div>
          <div className="pointer-events-auto flex items-center gap-0.5 rounded-xl border border-border bg-surface/95 p-1 shadow-card backdrop-blur">
            <Popover trigger={({ toggle }) => (
              <Tooltip label="Add node (N, or double-click canvas)" side="bottom"><Button size="sm" variant="primary" onClick={toggle}><Plus className="size-4" /><span className="hidden sm:inline">Add</span><ChevronDown className="size-3 opacity-70" /></Button></Tooltip>
            )}>
              {(close) => (Object.keys(KIND_META) as NodeKind[]).filter((k) => k !== "GROUP").map((k) => (
                <MenuItem key={k} icon={<span>{KIND_META[k].icon}</span>} onClick={() => {
                  close();
                  const c = rf.screenToFlowPosition({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
                  const sel = store.getState().nodes.filter((n) => n.selected);
                  if (sel.length === 1) { const id = addChild(sel[0].id); if (id) store.getState().updateNode(id, { kind: k }, { checkpoint: false }); }
                  else createNodeAt({ x: c.x - 110 + Math.random() * 40, y: c.y - 24 + Math.random() * 40 }, { kind: k });
                }}>{KIND_META[k].label}</MenuItem>
              ))}
            </Popover>
            <Popover trigger={({ toggle }) => (
              <Tooltip label="Type for new connections" side="bottom">
                <button onClick={toggle} className="flex h-8 items-center gap-1.5 rounded-lg px-2 text-xs font-medium hover:bg-surface-2" style={{ color: RELATION_META[defaultRelation].color }}>
                  <svg width="18" height="6" aria-hidden><line x1="0" y1="3" x2="18" y2="3" stroke="currentColor" strokeWidth="2" strokeDasharray={RELATION_META[defaultRelation].dashed ? "4 3" : undefined} /></svg>
                  <span className="hidden md:inline">{RELATION_META[defaultRelation].label}</span><ChevronDown className="size-3" />
                </button>
              </Tooltip>
            )}>
              {(close) => (Object.keys(RELATION_META) as Relation[]).map((r) => (
                <MenuItem key={r} active={r === defaultRelation} onClick={() => { setDefaultRelation(r); close(); }} icon={<span className="block size-2.5 rounded-full" style={{ background: RELATION_META[r].color }} />}>{RELATION_META[r].label}</MenuItem>
              ))}
            </Popover>
            <span className="mx-0.5 h-5 w-px bg-border" />
            <Tooltip label="Undo (⌘Z)" side="bottom"><Button variant="ghost" size="icon-sm" disabled={!canUndo} onClick={() => store.getState().undo()} aria-label="Undo"><Undo2 className="size-4" /></Button></Tooltip>
            <Tooltip label="Redo (⇧⌘Z)" side="bottom"><Button variant="ghost" size="icon-sm" disabled={!canRedo} onClick={() => store.getState().redo()} aria-label="Redo"><Redo2 className="size-4" /></Button></Tooltip>
            <span className="mx-0.5 h-5 w-px bg-border" />
            <Popover trigger={({ toggle }) => <Tooltip label="Auto-arrange" side="bottom"><Button variant="ghost" size="icon-sm" onClick={toggle} aria-label="Auto-arrange"><LayoutGrid className="size-4" /></Button></Tooltip>}>
              {(close) => (
                <>
                  <MenuItem onClick={() => { close(); layout("LR"); }}>Arrange left → right</MenuItem>
                  <MenuItem onClick={() => { close(); layout("TB"); }}>Arrange top → bottom</MenuItem>
                </>
              )}
            </Popover>
            <Tooltip label="Group selection (⌘G)" side="bottom"><Button variant="ghost" size="icon-sm" onClick={groupSelection} aria-label="Group selection"><Group className="size-4" /></Button></Tooltip>
            <Tooltip label="Search (⌘F)" side="bottom"><Button variant="ghost" size="icon-sm" onClick={() => { setSearchOpen(!searchOpen); setTimeout(() => searchInput.current?.focus(), 10); }} aria-label="Search map"><Search className="size-4" /></Button></Tooltip>
            <Popover align="end" className="w-64" trigger={({ toggle }) => <Button variant="ghost" size="icon-sm" onClick={toggle} aria-label="More"><MoreHorizontal className="size-4" /></Button>}>
              {(close) => (
                <>
                  <MenuItem icon={<MapIcon />} onClick={() => { setShowMinimap(!showMinimap); close(); }}>{showMinimap ? "Hide minimap" : "Show minimap"}</MenuItem>
                  <MenuItem icon={<Waves />} onClick={() => { setAnimate(!animate); close(); }}>{animate ? "Stop flow animation" : "Animate flows"}</MenuItem>
                  <MenuItem icon={<BoxSelect />} onClick={() => { close(); rf.fitView({ duration: 400, padding: 0.15 }); }}>Fit to screen</MenuItem>
                  <MenuItem icon={<Plus />} onClick={async () => { close(); try { await flush(); const { map } = await post<{ map: { id: string } }>(`/api/maps/${mapId}/duplicate`); router.push(`/maps/${map.id}`); } catch (e) { toast.error(e); } }}>Duplicate map</MenuItem>
                  <MenuSeparator />
                  <div className="px-2.5 py-2"><p className="mb-1.5 text-[11px] font-medium uppercase text-muted">Connection types</p><LegendPanel /></div>
                  <MenuSeparator />
                  <div className="space-y-1 px-2.5 py-2 text-[11px] text-muted">
                    <p><Kbd>Tab</Kbd> child · <Kbd>↵</Kbd> sibling · <Kbd>F2</Kbd> rename</p>
                    <p><Kbd>Space</Kbd> collapse · <Kbd>⌘D</Kbd> duplicate · <Kbd>⌫</Kbd> delete</p>
                    <p><Kbd>Shift</Kbd>+drag box-select · <Kbd>⌘G</Kbd> group</p>
                  </div>
                  <MenuSeparator />
                  <MenuItem danger onClick={async () => {
                    close();
                    if (!(await confirm({ title: "Archive this map?", body: "Archived maps can be restored from the Mind Maps page.", confirmLabel: "Archive" }))) return;
                    await flush(); await patch(`/api/maps/${mapId}`, { archived: true }); router.push("/maps");
                  }}>Archive map</MenuItem>
                </>
              )}
            </Popover>
            {aiOn && <AiSummaryButton mapId={mapId} flush={flush} />}
          </div>
          {searchOpen && (
            <div className="pointer-events-auto flex items-center gap-1 rounded-xl border border-border bg-surface/95 p-1 pl-2.5 shadow-card backdrop-blur">
              <Search className="size-3.5 text-muted" />
              <input ref={searchInput} value={search} placeholder="Find in map…" className="w-40 bg-transparent text-sm outline-none"
                onChange={(e) => { store.getState().set(() => ({ search: e.target.value })); setMatchIdx(-1); }}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); gotoMatch(e.shiftKey ? -1 : 1); } if (e.key === "Escape") { store.getState().set(() => ({ search: "" })); setSearchOpen(false); } }} />
              <span className="text-xs tabular text-muted">{search ? `${matches.length ? Math.max(1, matchIdx + 1) : 0}/${matches.length}` : ""}</span>
              <Button variant="ghost" size="icon-sm" aria-label="Close search" onClick={() => { store.getState().set(() => ({ search: "" })); setSearchOpen(false); }}><X className="size-3.5" /></Button>
            </div>
          )}
        </div>

        {selectedNodes.length > 1 && (
          <div className="absolute bottom-5 left-1/2 z-10 flex -translate-x-1/2 items-center gap-1 rounded-xl border border-border bg-surface p-1 shadow-pop animate-pop-in">
            <span className="px-2 text-xs font-medium text-muted">{selectedNodes.length} selected</span>
            <Button size="sm" variant="ghost" onClick={groupSelection}><Group className="size-3.5" /> Group</Button>
            {selectedNodes.some((n) => n.type === "group") && <Button size="sm" variant="ghost" onClick={() => selectedNodes.filter((n) => n.type === "group").forEach((g) => ungroup(g.id))}><Ungroup className="size-3.5" /> Ungroup</Button>}
            <Button size="sm" variant="ghost" onClick={() => duplicate(selectedNodes.map((n) => n.id))}>Duplicate</Button>
            <Button size="sm" variant="ghost" className="text-danger" onClick={() => remove(selectedNodes.map((n) => n.id), selectedEdges.map((e) => e.id))}>Delete</Button>
          </div>
        )}

        {nodes.length <= 1 && !single && (
          <div className="pointer-events-none absolute inset-x-0 bottom-24 flex justify-center">
            <p className="rounded-full border border-border bg-surface/90 px-4 py-2 text-sm text-muted shadow-soft">Double-click anywhere to add a thought · drag from a node’s edge to connect or branch</p>
          </div>
        )}

        {showPanel && (
          <aside className={cn("absolute z-20 border-border bg-surface shadow-pop animate-slide-in", isDesktop ? "right-0 top-0 bottom-0 w-[340px] border-l" : "inset-x-0 bottom-0 h-[60%] rounded-t-2xl border-t")} aria-label="Details">
            {single && (single.type === "group" ? (
              <div className="flex h-full flex-col">
                <NodePanel node={single} actions={panelActions} onClose={() => setPanelOpen(false)} />
                <div className="border-t border-border p-3"><Button size="sm" className="w-full" onClick={() => ungroup(single.id)}><Ungroup className="size-3.5" /> Ungroup</Button></div>
              </div>
            ) : (
              <NodePanel node={single} actions={panelActions} onClose={() => setPanelOpen(false)} />
            ))}
            {singleEdge && <EdgePanel edge={singleEdge} onClose={() => setPanelOpen(false)} onRemove={() => remove([], [singleEdge.id])} />}
          </aside>
        )}
      </div>
    </MapCtx.Provider>
  );
}

function SaveIndicator({ state, onRetry }: { state: SaveState; onRetry: () => void }) {
  if (state === "error") return <button onClick={onRetry} className="flex items-center gap-1 rounded-md px-1.5 py-1 text-xs text-danger hover:bg-danger-soft" title="Retry saving"><CloudOff className="size-3.5" /> Not saved</button>;
  if (state === "saving" || state === "dirty") return <span className="flex items-center gap-1 px-1.5 text-xs text-muted"><Loader2 className="size-3 animate-spin" /> Saving</span>;
  return <span className="flex items-center gap-1 px-1.5 text-xs text-muted"><Check className="size-3.5 text-success" /> Saved</span>;
}

