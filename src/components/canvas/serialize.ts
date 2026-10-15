import { tr } from "@/lib/i18n";
import { MarkerType } from "@xyflow/react";
import type { EdgeInput, NodeInput } from "@/lib/validation";
import { RELATION_META, type Linked, type MindNode, type MindNodeData, type NodeKind, type Relation, type RelationEdge } from "./types";

export interface ApiNode {
  id: string; kind: NodeKind; title: string; description: string; color: string; shape: MindNodeData["shape"]; icon: string;
  x: number; y: number; width: number | null; height: number | null; collapsed: boolean; parentId: string | null; tags: string[]; links: string[];
  noteId: string | null; taskId: string | null; goalId: string | null; projectId: string | null; habitId: string | null;
  linked: Linked; attachmentCount: number;
}
export interface ApiEdge {
  id: string; sourceId: string; targetId: string; sourceHandle: string | null; targetHandle: string | null;
  relation: Relation; label: string; description: string; bidirectional: boolean;
}

export function toFlowNodes(nodes: ApiNode[]): MindNode[] {
  const out: MindNode[] = nodes.map((n) => ({
    id: n.id,
    type: n.kind === "GROUP" ? "group" : "mind",
    position: { x: n.x, y: n.y },
    ...(n.parentId ? { parentId: n.parentId } : {}),
    ...(n.kind === "GROUP" ? { width: n.width ?? 400, height: n.height ?? 260, zIndex: -1 } : {}),
    data: {
      kind: n.kind, title: n.title, description: n.description, color: n.color, shape: n.shape, icon: n.icon, tags: n.tags, links: n.links,
      collapsed: n.collapsed, noteId: n.noteId, taskId: n.taskId, goalId: n.goalId, projectId: n.projectId, habitId: n.habitId,
      linked: n.linked, attachmentCount: n.attachmentCount,
    },
  }));
  return sortParentsFirst(out);
}

/** React Flow requires parent nodes to appear before their children. */
export function sortParentsFirst(nodes: MindNode[]) {
  return [...nodes.filter((n) => n.type === "group"), ...nodes.filter((n) => n.type !== "group")];
}

export function toFlowEdges(edges: ApiEdge[]): RelationEdge[] {
  return edges.map((e) => ({
    id: e.id,
    source: e.sourceId,
    target: e.targetId,
    sourceHandle: e.sourceHandle ?? undefined,
    targetHandle: e.targetHandle ?? undefined,
    type: "relation",
    data: { relation: e.relation, label: e.label, description: e.description, bidirectional: e.bidirectional },
  }));
}

export function toNodeInputs(nodes: MindNode[]): NodeInput[] {
  return nodes.map((n) => {
    const d = n.data;
    const isGroup = d.kind === "GROUP";
    return {
      id: n.id, kind: d.kind, title: d.title.slice(0, 500), description: d.description, color: d.color, shape: d.shape, icon: d.icon,
      x: Math.round(n.position.x * 10) / 10, y: Math.round(n.position.y * 10) / 10,
      width: isGroup ? n.width ?? n.measured?.width ?? null : null,
      height: isGroup ? n.height ?? n.measured?.height ?? null : null,
      collapsed: d.collapsed, parentId: n.parentId ?? null, tags: d.tags, links: d.links,
      noteId: d.noteId, taskId: d.taskId, goalId: d.goalId, projectId: d.projectId, habitId: d.habitId,
    };
  });
}

export function toEdgeInputs(edges: RelationEdge[]): EdgeInput[] {
  return edges.map((e) => ({
    id: e.id, sourceId: e.source, targetId: e.target, sourceHandle: e.sourceHandle ?? null, targetHandle: e.targetHandle ?? null,
    relation: e.data?.relation ?? "RELATED_TO", label: e.data?.label ?? "", description: e.data?.description ?? "", bidirectional: e.data?.bidirectional ?? false,
  }));
}

/** Derives render-time props (markers, animation, hidden) without mutating store objects. Cached per edge object. */
const edgeCache = new WeakMap<RelationEdge, { key: string; out: RelationEdge }>();
export function decorateEdge(e: RelationEdge, hidden: boolean, animate: boolean): RelationEdge {
  const key = `${hidden}|${animate}`;
  const c = edgeCache.get(e);
  if (c && c.key === key) return c.out;
  const meta = RELATION_META[e.data?.relation ?? "RELATED_TO"];
  const marker = { type: MarkerType.ArrowClosed, color: meta.color, width: 16, height: 16 };
  const out: RelationEdge = {
    ...e,
    ariaLabel: tr("Connection: {type}", { type: meta.label }),
    hidden,
    animated: animate && !!meta.animated,
    markerEnd: e.data?.relation === "RELATED_TO" && !e.data?.bidirectional ? undefined : marker,
    markerStart: e.data?.bidirectional ? marker : undefined,
  };
  edgeCache.set(e, { key, out });
  return out;
}

const nodeCache = new WeakMap<MindNode, { key: string; out: MindNode }>();
export function decorateNode(n: MindNode, hidden: boolean, match: boolean, hiddenDescendants: number, hasChildren: boolean): MindNode {
  const key = `${hidden}|${match}|${hiddenDescendants}|${hasChildren}`;
  if (!hidden && !match && !hiddenDescendants && !hasChildren && !n.hidden) return n;
  const c = nodeCache.get(n);
  if (c && c.key === key) return c.out;
  const out = { ...n, hidden, data: { ...n.data, match, hiddenDescendants, hasChildren } };
  nodeCache.set(n, { key, out });
  return out;
}
