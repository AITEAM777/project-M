"use client";
import { tp, tr } from "@/lib/i18n";
import { useProTools } from "@/lib/client/billing";
import { ProBadge } from "@/components/billing/pro-badge";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useStore } from "zustand";
import {
  Background, BackgroundVariant, ConnectionMode, Controls, MiniMap, ReactFlow, ReactFlowProvider, SelectionMode, useReactFlow,
  type Connection, type FinalConnectionState, type OnConnectEnd, type Viewport,
} from "@xyflow/react";
import {
  ArrowLeft, BoxSelect, Check, ChevronDown, CloudOff, History, TriangleAlert, Group, LayoutGrid, Loader2, Map as MapIcon, MoreHorizontal, Plus, Redo2, Search,
  Undo2, Ungroup, Waves, X,
} from "lucide-react";
import { api, invalidate, patch, post, put, withParams } from "@/lib/client/api";
import { confirm, toast, useUpgrade, useWorkspace } from "@/lib/client/store";
import { reportGoals, type GoalDelta } from "@/lib/client/celebrate";
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
import { FocusOverlay } from "./focus";
import { PathOverlay } from "./path-view";
import { pathToGoal } from "./path";
import { structureCenter, structures, type Structure } from "./structures";
import { dayKey } from "@/lib/habits";
import { clearDraft, readDraft, sameGraph, writeDraft, type MapDraft } from "./draft";

interface MapResponse {
  map: { id: string; title: string; description: string; viewport: Viewport | null; workspaceId: string; revision: number; folder: { id: string; name: string; icon: string } | null };
  nodes: ApiNode[];
  edges: ApiEdge[];
}

type SaveState = "saved" | "dirty" | "saving" | "error" | "conflict";

/** Saves still in flight when an editor closes; opening that map again waits for them first. */
const pendingSaves = new Map<string, Promise<unknown>>();

export function MapEditor({ mapId }: { mapId: string }) {
  // Always load the graph fresh from the server — never from a cache — so returning to a
  // map shows exactly what was saved, and autosave can't overwrite it with an old copy.
  const [{ data, error }, setLoaded] = useState<{ data?: MapResponse; error?: Error }>({});
  const [reloads, setReloads] = useState(0);
  useEffect(() => {
    let alive = true;
    setLoaded({});
    (async () => {
      try {
        await pendingSaves.get(mapId)?.catch(() => {});
        const fresh = await api<MapResponse>(`/api/maps/${mapId}`);
        if (alive) setLoaded({ data: fresh });
      } catch (e) {
        if (alive) setLoaded({ error: e as Error });
      }
    })();
    return () => { alive = false; };
  }, [mapId, reloads]);
  if (error) return <div className="grid h-full place-items-center p-6 text-center text-sm text-muted">{tr("Could not open this map:")}{" "}{error.message}<br /><Link href="/maps" className="mt-2 text-accent">{tr("Back to maps")}</Link></div>;
  if (!data || data.map.id !== mapId) return <div className="grid h-full place-items-center"><Spinner className="size-7" /></div>;
  return (
    <ReactFlowProvider>
      <Editor key={`${mapId}:${reloads}`} initial={data} onReload={() => setReloads((n) => n + 1)} />
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

function Editor({ initial, onReload }: { initial: MapResponse; onReload: () => void }) {
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
  const [focusId, setFocusId] = useState<string | null>(null);
  const [pathId, setPathId] = useState<string | null>(null);
  const wrapper = useRef<HTMLDivElement>(null);
  const searchInput = useRef<HTMLInputElement>(null);

  /* ---------------- persistence ---------------- */
  const saving = useRef<Promise<void> | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dirty = useRef(false);
  const retry = useRef(0);
  /** Server revision this editor's copy is based on (see the graph PUT route). */
  const revision = useRef(initial.map.revision ?? 0);
  /** Set when another window saved first: autosave pauses until the user picks a side. */
  const blocked = useRef(false);
  const closed = useRef(false);
  const [conflict, setConflict] = useState<{ revision: number } | null>(null);
  const draftTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveDraft = useCallback(() => {
    if (draftTimer.current) { clearTimeout(draftTimer.current); draftTimer.current = null; }
    const { nodes, edges } = store.getState();
    writeDraft(mapId, revision.current, nodes, edges);
  }, [mapId, store]);
  // Unsaved edits left behind last time (closed tab, crash, failed save) — offered back once.
  const [draft, setDraft] = useState<MapDraft | null>(() => {
    const d = readDraft(mapId);
    if (!d) return null;
    const s = store.getState();
    if (sameGraph(d, s.nodes, s.edges)) { clearDraft(mapId); return null; }
    return d;
  });

  const saveNow = useCallback(async (): Promise<void> => {
    if (saving.current) { await saving.current; if (!dirty.current) return; }
    if (!dirty.current || blocked.current) return;
    dirty.current = false;
    const { nodes, edges } = store.getState();
    setSaveState("saving");
    const p = put<{ revision: number }>(`/api/maps/${mapId}/graph`, { nodes: toNodeInputs(nodes), edges: toEdgeInputs(edges), baseRevision: revision.current })
      .then((r) => {
        retry.current = 0;
        revision.current = r.revision;
        if (!dirty.current) {
          if (draftTimer.current) { clearTimeout(draftTimer.current); draftTimer.current = null; }
          clearDraft(mapId);
        }
        setSaveState(dirty.current ? "dirty" : "saved");
      })
      .catch((e: { status?: number; message?: string; details?: { conflict?: boolean; revision?: number } }) => {
        dirty.current = true;
        if (e.status === 409 && e.details?.conflict) {
          blocked.current = true;
          saveDraft();
          setSaveState("conflict");
          setConflict({ revision: e.details.revision ?? revision.current });
          return;
        }
        setSaveState("error");
        if (closed.current) return;
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
  }, [mapId, store, saveDraft]);

  const flush = useCallback(async () => {
    if (timer.current) clearTimeout(timer.current);
    await saveNow();
  }, [saveNow]);

  useEffect(() => {
    closed.current = false;
    const unsub = store.subscribe((s, prev) => {
      if (s.version === prev.version) return;
      dirty.current = true;
      if (draftTimer.current) clearTimeout(draftTimer.current);
      draftTimer.current = setTimeout(saveDraft, 300);
      if (blocked.current) return;
      setSaveState("dirty");
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => void saveNow(), 700);
    });
    const beforeUnload = (e: BeforeUnloadEvent) => { if (dirty.current) { saveDraft(); e.preventDefault(); } };
    window.addEventListener("beforeunload", beforeUnload);
    return () => {
      unsub();
      closed.current = true;
      window.removeEventListener("beforeunload", beforeUnload);
      if (timer.current) clearTimeout(timer.current);
      if (dirty.current) saveDraft();
      else if (draftTimer.current) clearTimeout(draftTimer.current);
      const inFlight = saving.current;
      let last: Promise<unknown> | null = inFlight;
      if (dirty.current || inFlight) {
        // Flush when navigating away inside the app — after any save already on its way, so an
        // older snapshot can never land after the newest one (and its revision is the right base).
        // If this fails or hits a conflict, the draft stays and is offered back on the next visit.
        last = (inFlight ?? Promise.resolve()).catch(() => {}).then(async () => {
          if (!dirty.current || blocked.current) return;
          const { nodes, edges } = store.getState();
          const body = JSON.stringify({ nodes: toNodeInputs(nodes), edges: toEdgeInputs(edges), baseRevision: revision.current });
          const res = await fetch(withParams(`/api/maps/${mapId}/graph`, useWorkspace.getState().id), { method: "PUT", keepalive: true, headers: { "Content-Type": "application/json" }, body });
          if (res.ok) clearDraft(mapId);
        });
      }
      if (last) {
        const tracked: Promise<unknown> = last.catch(() => {}).finally(() => { if (pendingSaves.get(mapId) === tracked) pendingSaves.delete(mapId); });
        pendingSaves.set(mapId, tracked);
      }
      invalidate("/api/maps", "/api/dashboard");
    };
  }, [store, saveNow, saveDraft, mapId]);

  /** Conflict: drop this window's edits and load what the other window saved. */
  const loadLatest = useCallback(() => {
    clearDraft(mapId);
    dirty.current = false;
    onReload();
  }, [mapId, onReload]);
  /** Conflict: keep this window's version and save it over the other one. */
  const keepMine = useCallback(() => {
    revision.current = conflict?.revision ?? revision.current;
    blocked.current = false;
    setConflict(null);
    dirty.current = true;
    void saveNow();
  }, [conflict, saveNow]);
  const restoreDraft = useCallback(() => {
    if (!draft) return;
    store.getState().commit(() => ({ nodes: sortParentsFirst(draft.nodes.map((n) => ({ ...n, selected: false }))), edges: draft.edges }));
    setDraft(null);
    toast.success(tr("Unsaved changes restored"), { label: tr("Undo"), run: () => store.getState().undo() });
  }, [draft, store]);
  const discardDraft = useCallback(() => {
    setDraft(null);
    if (!dirty.current) clearDraft(mapId);
  }, [mapId]);

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
    const what = ids.length ? tp(ids.length, "# node", "# nodes") : tp(edgeIds.length, "# connection", "# connections");
    toast.info(tr("Deleted {what}", { what }), { label: tr("Undo"), run: () => store.getState().undo() });
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
    if (!sel.length) return toast.info(tr("Select nodes to group (shift-drag to box-select)"));
    const xs = sel.map((n) => n.position.x), ys = sel.map((n) => n.position.y);
    const x2 = sel.map((n) => n.position.x + (n.measured?.width ?? 220)), y2 = sel.map((n) => n.position.y + (n.measured?.height ?? 64));
    const gx = Math.min(...xs) - 28, gy = Math.min(...ys) - 44;
    const gid = uid("n_");
    const group: MindNode = {
      id: gid, type: "group", position: { x: gx, y: gy }, width: Math.max(...x2) - gx + 28, height: Math.max(...y2) - gy + 28, zIndex: -1,
      data: { ...newNode(gid, { x: 0, y: 0 }).data, kind: "GROUP", title: tr("Group") },
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
      const res = await patch<{ goals?: GoalDelta[] }>(`/api/tasks/${task.id}`, { status });
      reportGoals(res.goals);
      invalidate("/api/tasks", "/api/dashboard", "/api/goals");
      if (status === "DONE") toast.success(tr("Completed “{title}”", { title: task.title }));
      refreshLinked().catch(() => {});
    } catch (e) { apply(task.status); toast.error(e); }
  }, [store, refreshLinked]);

  const toggleHabitToday = useCallback(async (nodeId: string) => {
    const habit = store.getState().nodes.find((x) => x.id === nodeId)?.data.linked?.habit;
    if (!habit) return;
    const key = dayKey(new Date());
    const target = Math.max(1, habit.targetPerPeriod ?? 1);
    const cur = habit.logs?.[key] ?? 0;
    const next = cur >= target ? 0 : target;
    const apply = (count: number) => store.getState().set((s) => ({
      nodes: s.nodes.map((x) => (x.data.linked?.habit?.id === habit.id
        ? { ...x, data: { ...x.data, linked: { ...x.data.linked, habit: { ...x.data.linked.habit, logs: { ...x.data.linked.habit.logs, [key]: count } } } } }
        : x)),
    }));
    apply(next);
    try {
      await put(`/api/habits/${habit.id}/log`, { date: key, count: next });
      if (next) navigator.vibrate?.(12);
      invalidate("/api/habits", "/api/dashboard");
    } catch (e) { apply(cur); toast.error(e); }
  }, [store]);

  const startFocus = useCallback((id: string) => {
    setPathId(null);
    setFocusId(id);
    setPanelOpen(false);
  }, []);
  const proTools = useProTools();
  const proRef = useRef(proTools);
  proRef.current = proTools;
  const startPath = useCallback((id: string) => {
    if (!proRef.current) { useUpgrade.getState().open("path"); return; }
    setFocusId(null);
    setPathId(id);
    setPanelOpen(false);
  }, []);

  const actions: MapActions = useMemo(() => ({
    proTools,
    toggleHabitToday: (id) => void toggleHabitToday(id),
    focus: startFocus,
    path: startPath,
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
  }), [store, addChild, setTaskStatus, toggleHabitToday, startFocus, startPath, proTools]);

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
        toast.success(tr("Node moved"), { label: tr("Open map"), run: () => router.push(`/maps/${target}?node=${nodeId}`) });
      } catch (e) { toast.error(e); }
    },
    select: (id) => selectNode(id),
    flush,
    setTaskStatus,
    path: startPath,
    focus: startFocus,
  }), [duplicate, remove, flush, mapId, refreshLinked, store, router, selectNode, setTaskStatus, startPath, startFocus]);

  /* ---------------- React Flow handlers ---------------- */
  const onConnect = useCallback((c: Connection) => {
    if (c.source === c.target) return;
    const s = store.getState();
    if (s.edges.some((e) => (e.source === c.source && e.target === c.target) || (e.source === c.target && e.target === c.source))) return toast.info(tr("These nodes are already connected"));
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

  /* ---------------- guided tour hooks ---------------- */
  useEffect(() => {
    const onTour = (e: Event) => {
      const action = (e as CustomEvent<string>).detail;
      const s = store.getState();
      if (action === "select-first-node") {
        const targets = new Set(s.edges.map((x) => x.target));
        const first = s.nodes.find((n) => n.type !== "group" && !targets.has(n.id)) ?? s.nodes.find((n) => n.type !== "group");
        if (first && !s.nodes.some((n) => n.selected && n.id === first.id)) selectNode(first.id);
        setPanelOpen(true);
      }
      if (action === "deselect") s.set((st) => ({ nodes: st.nodes.map((n) => (n.selected ? { ...n, selected: false } : n)) }));
    };
    window.addEventListener("nodera:tour", onTour);
    return () => window.removeEventListener("nodera:tour", onTour);
  }, [store, selectNode]);

  /* ---------------- focus mode ---------------- */
  const focusRef = useRef<string | null>(null);
  const branchRef = useRef<Set<string>>(new Set());
  focusRef.current = focusId;
  const focusSet = useMemo(() => {
    if (!focusId) return null;
    const set = new Set([focusId]);
    // Everything downstream of the focused card…
    const queue = [focusId];
    while (queue.length) {
      const cur = queue.shift()!;
      for (const e of edges) if (e.source === cur && !set.has(e.target)) { set.add(e.target); queue.push(e.target); }
    }
    branchRef.current = new Set(set);
    // …plus the chain of parents above it, for context.
    let up = edges.find((e) => e.target === focusId)?.source;
    while (up && !set.has(up)) { set.add(up); up = edges.find((e) => e.target === up)?.source; }
    return set;
  }, [focusId, edges]);
  useEffect(() => {
    if (!focusSet) return;
    if (!nodes.some((n) => n.id === focusId)) { setFocusId(null); return; }
    const t = setTimeout(() => rf.fitView({ nodes: [...focusSet].map((id) => ({ id })), duration: 500, padding: 0.3, maxZoom: 1.2 }), 30);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusId]);

  /* ---------------- path to goal ---------------- */
  const pathRef = useRef<string | null>(null);
  pathRef.current = pathId;
  const pathInfo = useMemo(() => (pathId && nodes.some((n) => n.id === pathId) ? pathToGoal(pathId, nodes, edges) : null), [pathId, nodes, edges]);
  useEffect(() => {
    if (pathId && !nodes.some((n) => n.id === pathId)) setPathId(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathId, nodes.length]);
  useEffect(() => {
    if (!pathInfo) return;
    const t = setTimeout(() => rf.fitView({ nodes: [...pathInfo.ids].map((id) => ({ id })), duration: 500, padding: 0.3, maxZoom: 1.2 }), 30);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathId]);

  /* ---------------- structures ---------------- */
  const insertStructure = useCallback((s: Structure) => {
    const st = store.getState();
    const sel = st.nodes.filter((n) => n.selected && n.type !== "group");
    const anchor = sel.length === 1 ? sel[0] : null;
    const c = structureCenter(s);
    let origin: { x: number; y: number };
    if (anchor) {
      const p = absPosition(anchor, st.nodes);
      const root = s.nodes.find((n) => n.key === s.root)!;
      origin = { x: p.x + 340 - root.x, y: p.y - root.y };
    } else {
      const v = rf.screenToFlowPosition({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
      origin = { x: v.x - c.x, y: v.y - c.y };
    }
    // Never drop a structure on top of existing cards: try the spot, then below / right of the map.
    const boxes = st.nodes.filter((n) => n.type !== "group").map((n) => { const p = absPosition(n, st.nodes); return { x: p.x, y: p.y, w: n.measured?.width ?? 220, h: n.measured?.height ?? 70 }; });
    const xs = s.nodes.map((n) => n.x), ys = s.nodes.map((n) => n.y);
    const sw = Math.max(...xs) - Math.min(...xs) + 220, sh = Math.max(...ys) - Math.min(...ys) + 80;
    const fits = (o: { x: number; y: number }) => {
      const L = o.x + Math.min(...xs) - 40, T = o.y + Math.min(...ys) - 40, R = L + sw + 80, B = T + sh + 80;
      return !boxes.some((b) => b.x < R && b.x + b.w > L && b.y < B && b.y + b.h > T);
    };
    if (boxes.length && !fits(origin)) {
      const minX = Math.min(...boxes.map((b) => b.x)), maxX = Math.max(...boxes.map((b) => b.x + b.w));
      const minY = Math.min(...boxes.map((b) => b.y)), maxY = Math.max(...boxes.map((b) => b.y + b.h));
      const below = { x: minX - Math.min(...xs), y: maxY + 160 - Math.min(...ys) };
      const right = { x: maxX + 220 - Math.min(...xs), y: minY - Math.min(...ys) };
      origin = fits(below) ? below : right;
    }
    const ids = new Map(s.nodes.map((n) => [n.key, uid("n_")]));
    const newNodes: MindNode[] = s.nodes.map((n) => {
      const base = newNode(ids.get(n.key)!, { x: Math.round(origin.x + n.x), y: Math.round(origin.y + n.y) }, n.kind, n.title);
      return { ...base, selected: n.key === s.root, data: { ...base.data, icon: n.icon ?? "", color: n.color ?? "", description: n.description ?? "" } };
    });
    const mk = (from: string, to: string, relation: Relation): RelationEdge => ({ id: uid("e_"), source: from, target: to, type: "relation", data: { relation, label: "", description: "", bidirectional: false } });
    const newEdges = s.edges.map((e) => mk(ids.get(e.from)!, ids.get(e.to)!, e.relation));
    if (anchor) newEdges.push(mk(anchor.id, ids.get(s.root)!, "LEADS_TO"));
    st.commit((cur) => ({ nodes: [...cur.nodes.map((n) => (n.selected ? { ...n, selected: false } : n)), ...newNodes], edges: [...cur.edges, ...newEdges] }));
    setTimeout(() => rf.fitView({ nodes: newNodes.map((n) => ({ id: n.id })), duration: 500, padding: 0.25, maxZoom: 1.1 }), 60);
    toast.success(tr("Added “{name}” — rename the cards to make it yours", { name: s.name }));
  }, [store, rf]);

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
      if (e.key === "Escape" && (focusRef.current || pathRef.current)) { setFocusId(null); setPathId(null); return; }
      if (selNodes.length === 1) {
        const n = selNodes[0];
        if (!mod && k === "f") { e.preventDefault(); startFocus(n.id); return; }
        if (!mod && k === "p") { e.preventDefault(); startPath(n.id); return; }
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
  }, [store, duplicate, ungroup, groupSelection, flush, remove, addChild, addSibling, actions, rf, createNodeAt, startFocus, startPath]);

  /* ---------------- derived render state ---------------- */
  const collapsedKey = nodes.filter((n) => n.data.collapsed).map((n) => n.id).join(",");
  const { hidden, counts } = useMemo(() => computeHidden(store.getState().nodes, edges),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [collapsedKey, edges]);
  const matchSet = useMemo(() => new Set(matches), [matches]);
  const parents = useMemo(() => new Set(edges.map((e) => e.source)), [edges]);
  const viewNodes = useMemo(() => nodes.map((n) => {
    const d = decorateNode(n, hidden.has(n.id), matchSet.has(n.id), counts.get(n.id) ?? 0, parents.has(n.id));
    if (pathInfo) {
      if (!pathInfo.ids.has(n.id)) return { ...d, className: cn(d.className, "map-dimmed") };
      const step = pathInfo.steps.find((s) => s.id === n.id);
      const cls = n.id === pathId ? (pathInfo.goal.state === "done" ? "map-path-goal" : pathInfo.goal.state === "blocked" ? "map-blocked" : "map-focus-root")
        : n.id === pathInfo.next?.id ? "map-next" : step?.state === "blocked" ? "map-blocked" : "";
      return { ...d, className: cn(d.className, cls) };
    }
    if (!focusSet) return d;
    return { ...d, className: cn(d.className, n.id === focusId ? "map-focus-root" : focusSet.has(n.id) ? "" : "map-dimmed") };
  }), [nodes, hidden, matchSet, counts, parents, focusSet, focusId, pathInfo, pathId]);
  const viewEdges = useMemo(() => edges.map((e) => {
    const d = decorateEdge(e, hidden.has(e.source) || hidden.has(e.target), animate && nodes.length < 400);
    if (pathInfo) return pathInfo.edges.has(e.id) ? { ...d, className: cn(d.className, "map-path"), animated: true } : { ...d, className: cn(d.className, "map-dimmed"), animated: false };
    return focusSet && !(focusSet.has(e.source) && focusSet.has(e.target)) ? { ...d, className: cn(d.className, "map-dimmed"), animated: false } : d;
  }), [edges, hidden, animate, nodes.length, focusSet, pathInfo]);

  const selectedNodes = nodes.filter((n) => n.selected);
  const selectedEdges = edges.filter((e) => e.selected);
  const single = selectedNodes.length === 1 && !selectedEdges.length ? selectedNodes[0] : null;
  const singleEdge = selectedEdges.length === 1 && !selectedNodes.length ? selectedEdges[0] : null;
  const showPanel = panelOpen && (single || singleEdge);

  const ctx = useMemo(() => ({ store, mapId, actions, readOnly: false }), [store, mapId, actions]);

  return (
    <MapCtx.Provider value={ctx}>
      <div ref={wrapper} data-tour="map-canvas" tabIndex={-1} className="absolute inset-0 outline-none" onDoubleClick={onPaneDoubleClick}>
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
              nodeColor={(n) => (n as MindNode).data.color || KIND_META[(n as MindNode).data.kind]?.color || "#999"} style={{ bottom: 80, ...(showPanel ? { right: 352 } : {}) }} />
          )}
        </ReactFlow>

        {/* Top toolbar */}
        <div className="pointer-events-none absolute inset-x-0 top-0 flex flex-wrap items-start gap-2 p-3">
          <div className="pointer-events-auto flex items-center gap-1 rounded-xl border border-border bg-surface/95 p-1 shadow-card backdrop-blur">
            <Link href="/maps" className="grid size-8 place-items-center rounded-lg text-muted hover:bg-surface-2 hover:text-text" aria-label={tr("Back to maps")}><ArrowLeft className="size-4" /></Link>
            <input value={title} onChange={(e) => changeTitle(e.target.value)} className="w-36 sm:w-56 rounded-md bg-transparent px-1.5 py-1 text-sm font-semibold outline-none hover:bg-surface-2 focus:bg-surface-2" aria-label={tr("Map title")} />
            <span data-tour="map-save"><SaveIndicator state={saveState} onRetry={() => void flush()} /></span>
          </div>
          <div className="pointer-events-auto flex items-center gap-0.5 rounded-xl border border-border bg-surface/95 p-1 shadow-card backdrop-blur">
            <Popover trigger={({ toggle }) => (
              <Tooltip label={tr("Add node (N, or double-click canvas)")} side="bottom"><Button data-tour="map-add" size="sm" variant="primary" onClick={toggle}><Plus className="size-4" /><span className="hidden sm:inline">{tr("Add")}</span><ChevronDown className="size-3 opacity-70" /></Button></Tooltip>
            )}>
              {(close) => (
                <div className="flex max-h-[70vh] gap-1 overflow-y-auto">
                  <div className="min-w-[170px]">
                    <p className="px-2.5 pb-1 pt-1.5 text-[11px] font-medium uppercase tracking-wide text-muted">{tr("Card")}</p>
                    {(Object.keys(KIND_META) as NodeKind[]).filter((k) => k !== "GROUP").map((k) => (
                      <MenuItem key={k} icon={<span>{KIND_META[k].icon}</span>} onClick={() => {
                        close();
                        const c = rf.screenToFlowPosition({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
                        const sel = store.getState().nodes.filter((n) => n.selected);
                        if (sel.length === 1) { const id = addChild(sel[0].id); if (id) store.getState().updateNode(id, { kind: k }, { checkpoint: false }); }
                        else createNodeAt({ x: c.x - 110 + Math.random() * 40, y: c.y - 24 + Math.random() * 40 }, { kind: k });
                      }}>{KIND_META[k].label}</MenuItem>
                    ))}
                  </div>
                  <div data-tour="map-structures" className="w-[250px] border-l border-border pl-1">
                    <p className="flex items-center gap-1.5 px-2.5 pb-1 pt-1.5 text-[11px] font-medium uppercase tracking-wide text-muted">{tr("Structure")}{!proTools && <ProBadge />}</p>
                    {structures().map((s) => (
                      <button key={s.id} onClick={() => { close(); if (proTools) insertStructure(s); else useUpgrade.getState().open("structures"); }} className="flex w-full items-start gap-2.5 rounded-lg px-2.5 py-2 text-left hover:bg-surface-2">
                        <span className="text-base leading-5">{s.icon}</span>
                        <span className="min-w-0"><span className="block text-[13px] font-medium">{s.name}</span><span className="block text-[11.5px] leading-snug text-muted">{s.hint}</span></span>
                      </button>
                    ))}
                    <p className="px-2.5 pb-1.5 pt-1 text-[11px] leading-snug text-muted">{tr("Select a card first to attach the structure to it.")}</p>
                  </div>
                </div>
              )}
            </Popover>
            <Popover trigger={({ toggle }) => (
              <Tooltip label={tr("Type for new connections")} side="bottom">
                <button data-tour="map-relation" onClick={toggle} className="flex h-8 items-center gap-1.5 rounded-lg px-2 text-xs font-medium hover:bg-surface-2" style={{ color: RELATION_META[defaultRelation].color }}>
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
            <span data-tour="map-tools" className="flex items-center gap-0.5"><Tooltip label={tr("Undo (⌘Z)")} side="bottom"><Button variant="ghost" size="icon-sm" disabled={!canUndo} onClick={() => store.getState().undo()} aria-label={tr("Undo")}><Undo2 className="size-4" /></Button></Tooltip>
            <Tooltip label={tr("Redo (⇧⌘Z)")} side="bottom"><Button variant="ghost" size="icon-sm" disabled={!canRedo} onClick={() => store.getState().redo()} aria-label={tr("Redo")}><Redo2 className="size-4" /></Button></Tooltip>
            <span className="mx-0.5 h-5 w-px bg-border" />
            <Popover trigger={({ toggle }) => <Tooltip label={tr("Auto-arrange")} side="bottom"><Button variant="ghost" size="icon-sm" onClick={toggle} aria-label={tr("Auto-arrange")}><LayoutGrid className="size-4" /></Button></Tooltip>}>
              {(close) => (
                <>
                  <MenuItem onClick={() => { close(); layout("LR"); }}>{tr("Arrange left → right")}</MenuItem>
                  <MenuItem onClick={() => { close(); layout("TB"); }}>{tr("Arrange top → bottom")}</MenuItem>
                </>
              )}
            </Popover>
            <Tooltip label={tr("Group selection (⌘G)")} side="bottom"><Button variant="ghost" size="icon-sm" onClick={groupSelection} aria-label={tr("Group selection")}><Group className="size-4" /></Button></Tooltip>
            <Tooltip label={tr("Search (⌘F)")} side="bottom"><Button variant="ghost" size="icon-sm" onClick={() => { setSearchOpen(!searchOpen); setTimeout(() => searchInput.current?.focus(), 10); }} aria-label={tr("Search map")}><Search className="size-4" /></Button></Tooltip></span>
            <Popover align="end" className="w-64" trigger={({ toggle }) => <Button data-tour="map-more" variant="ghost" size="icon-sm" onClick={toggle} aria-label={tr("More")}><MoreHorizontal className="size-4" /></Button>}>
              {(close) => (
                <>
                  <MenuItem icon={<MapIcon />} onClick={() => { setShowMinimap(!showMinimap); close(); }}>{showMinimap ? tr("Hide minimap") : tr("Show minimap")}</MenuItem>
                  <MenuItem icon={<Waves />} onClick={() => { setAnimate(!animate); close(); }}>{animate ? tr("Stop flow animation") : tr("Animate flows")}</MenuItem>
                  <MenuItem icon={<BoxSelect />} onClick={() => { close(); rf.fitView({ duration: 400, padding: 0.15 }); }}>{tr("Fit to screen")}</MenuItem>
                  <MenuItem icon={<Plus />} onClick={async () => { close(); try { await flush(); const { map } = await post<{ map: { id: string } }>(`/api/maps/${mapId}/duplicate`); router.push(`/maps/${map.id}`); } catch (e) { toast.error(e); } }}>{tr("Duplicate map")}</MenuItem>
                  <MenuSeparator />
                  <div className="px-2.5 py-2"><p className="mb-1.5 text-[11px] font-medium uppercase text-muted">{tr("Connection types")}</p><LegendPanel /></div>
                  <MenuSeparator />
                  <div className="space-y-1 px-2.5 py-2 text-[11px] text-muted">
                    <p><Kbd>{tr("Tab")}</Kbd>{" "}{tr("child ·")}{" "}<Kbd>↵</Kbd>{" "}{tr("sibling ·")}{" "}<Kbd>F2</Kbd> rename</p>
                    <p><Kbd>{tr("Space")}</Kbd>{" "}{tr("collapse ·")}{" "}<Kbd>{tr("⌘D")}</Kbd>{" "}{tr("duplicate ·")}{" "}<Kbd>⌫</Kbd> delete</p>
                    <p><Kbd>{tr("Shift")}</Kbd>{tr("+drag box-select ·")}{" "}<Kbd>{tr("⌘G")}</Kbd> group</p>
                  </div>
                  <MenuSeparator />
                  <MenuItem danger onClick={async () => {
                    close();
                    if (!(await confirm({ title: tr("Archive this map?"), body: tr("Archived maps can be restored from the Mind Maps page."), confirmLabel: tr("Archive") }))) return;
                    await flush(); await patch(`/api/maps/${mapId}`, { archived: true }); router.push("/maps");
                  }}>{tr("Archive map")}</MenuItem>
                </>
              )}
            </Popover>
            {aiOn && <AiSummaryButton mapId={mapId} flush={flush} />}
          </div>
          {searchOpen && (
            <div className="pointer-events-auto flex items-center gap-1 rounded-xl border border-border bg-surface/95 p-1 pl-2.5 shadow-card backdrop-blur">
              <Search className="size-3.5 text-muted" />
              <input ref={searchInput} value={search} placeholder={tr("Find in map…")} className="w-40 bg-transparent text-sm outline-none"
                onChange={(e) => { store.getState().set(() => ({ search: e.target.value })); setMatchIdx(-1); }}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); gotoMatch(e.shiftKey ? -1 : 1); } if (e.key === "Escape") { store.getState().set(() => ({ search: "" })); setSearchOpen(false); } }} />
              <span className="text-xs tabular text-muted">{search ? `${matches.length ? Math.max(1, matchIdx + 1) : 0}/${matches.length}` : ""}</span>
              <Button variant="ghost" size="icon-sm" aria-label={tr("Close search")} onClick={() => { store.getState().set(() => ({ search: "" })); setSearchOpen(false); }}><X className="size-3.5" /></Button>
            </div>
          )}
        </div>

        {(conflict || draft) && (
          <div className="pointer-events-none absolute inset-x-0 top-16 z-30 flex justify-center px-3">
            {conflict ? (
              <div role="alert" data-testid="map-conflict" className="pointer-events-auto flex max-w-xl flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border border-warning/40 bg-surface p-3 text-sm shadow-pop animate-pop-in">
                <TriangleAlert className="size-4 shrink-0 text-warning" />
                <p className="min-w-0 flex-1"><b>{tr("This map was changed in another window.")}</b>{" "}{tr("Your changes here are paused so nothing gets overwritten.")}</p>
                <div className="flex gap-1.5">
                  <Button size="sm" variant="primary" onClick={loadLatest}>{tr("Load the latest version")}</Button>
                  <Button size="sm" variant="ghost" onClick={keepMine}>{tr("Keep my changes")}</Button>
                </div>
              </div>
            ) : draft && (
              <div role="status" data-testid="map-draft" className="pointer-events-auto flex max-w-xl flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border border-border bg-surface p-3 text-sm shadow-pop animate-pop-in">
                <History className="size-4 shrink-0 text-accent" />
                <p className="min-w-0 flex-1">
                  <b>{tr("Unsaved changes found")}</b>{" "}{tr("from {time} on this device.", { time: new Date(draft.at).toLocaleString([], { dateStyle: "short", timeStyle: "short" }) })}
                  {draft.base < (initial.map.revision ?? 0) && <span className="block text-xs text-muted">{tr("The map was saved since then — restoring replaces that version (you can undo).")}</span>}
                </p>
                <div className="flex gap-1.5">
                  <Button size="sm" variant="primary" onClick={restoreDraft}>{tr("Restore")}</Button>
                  <Button size="sm" variant="ghost" onClick={discardDraft}>{tr("Discard")}</Button>
                </div>
              </div>
            )}
          </div>
        )}

        {pathId && pathInfo && (
          <PathOverlay goal={nodes.find((n) => n.id === pathId)} path={pathInfo} onExit={() => setPathId(null)} onSelect={(id) => selectNode(id)} />
        )}

        {focusId && focusSet && (
          <FocusOverlay
            root={nodes.find((n) => n.id === focusId)}
            members={nodes.filter((n) => focusSet.has(n.id))}
            branch={branchRef.current}
            onExit={() => setFocusId(null)}
            onSelect={(id) => selectNode(id)}
            onToggleTask={(id) => actions.toggleTask(id)}
            onToggleHabit={(id) => actions.toggleHabitToday(id)}
          />
        )}

        {selectedNodes.length > 1 && (
          <div className="absolute bottom-5 left-1/2 z-10 flex -translate-x-1/2 items-center gap-1 rounded-xl border border-border bg-surface p-1 shadow-pop animate-pop-in">
            <span className="px-2 text-xs font-medium text-muted">{tr("{n} selected", { n: selectedNodes.length })}</span>
            <Button size="sm" variant="ghost" onClick={groupSelection}><Group className="size-3.5" />{" "}{tr("Group")}</Button>
            {selectedNodes.some((n) => n.type === "group") && <Button size="sm" variant="ghost" onClick={() => selectedNodes.filter((n) => n.type === "group").forEach((g) => ungroup(g.id))}><Ungroup className="size-3.5" />{" "}{tr("Ungroup")}</Button>}
            <Button size="sm" variant="ghost" onClick={() => duplicate(selectedNodes.map((n) => n.id))}>{tr("Duplicate")}</Button>
            <Button size="sm" variant="ghost" className="text-danger" onClick={() => remove(selectedNodes.map((n) => n.id), selectedEdges.map((e) => e.id))}>{tr("Delete")}</Button>
          </div>
        )}

        {nodes.length <= 1 && !single && (
          <div className="pointer-events-none absolute inset-x-0 bottom-24 flex justify-center">
            <p className="rounded-full border border-border bg-surface/90 px-4 py-2 text-sm text-muted shadow-soft">{tr("Double-click anywhere to add a thought · drag from a node’s edge to connect or branch")}</p>
          </div>
        )}

        {showPanel && (
          <aside data-tour="map-panel" className={cn("absolute z-20 border-border bg-surface shadow-pop animate-slide-in", isDesktop ? "right-0 top-0 bottom-0 w-[340px] border-l" : "inset-x-0 bottom-0 h-[60%] rounded-t-2xl border-t")} aria-label={tr("Details")}>
            {single && (single.type === "group" ? (
              <div className="flex h-full flex-col">
                <NodePanel node={single} actions={panelActions} onClose={() => setPanelOpen(false)} />
                <div className="border-t border-border p-3"><Button size="sm" className="w-full" onClick={() => ungroup(single.id)}><Ungroup className="size-3.5" />{" "}{tr("Ungroup")}</Button></div>
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
  if (state === "conflict") return <span className="flex items-center gap-1 px-1.5 text-xs text-warning"><TriangleAlert className="size-3.5" />{" "}{tr("Paused")}</span>;
  if (state === "error") return <button onClick={onRetry} className="flex items-center gap-1 rounded-md px-1.5 py-1 text-xs text-danger hover:bg-danger-soft" title={tr("Retry saving")}><CloudOff className="size-3.5" />{" "}{tr("Not saved")}</button>;
  if (state === "saving" || state === "dirty") return <span className="flex items-center gap-1 px-1.5 text-xs text-muted"><Loader2 className="size-3 animate-spin" />{" "}{tr("Saving")}</span>;
  return <span className="flex items-center gap-1 px-1.5 text-xs text-muted"><Check className="size-3.5 text-success" />{" "}{tr("Saved")}</span>;
}

