import type { Edge, Node } from "@xyflow/react";

export type NodeKind = "THOUGHT" | "IDEA" | "GOAL" | "TASK" | "PROJECT" | "HABIT" | "NOTE" | "QUESTION" | "DECISION" | "RESOURCE" | "MILESTONE" | "GROUP";
export type Relation = "RELATED_TO" | "DEPENDS_ON" | "SUPPORTS" | "BLOCKS" | "PART_OF" | "REQUIRES" | "CONFLICTS_WITH" | "COMBINES_WITH" | "LEADS_TO";

export interface Linked {
  task: { id: string; title: string; status: string; dueDate: string | null; priority: string } | null;
  note: { id: string; title: string; preview: string } | null;
  goal: { id: string; title: string; status: string; progress: number } | null;
  project: { id: string; title: string; status: string; progress: number } | null;
  habit: { id: string; title: string; icon: string } | null;
}

export interface MindNodeData extends Record<string, unknown> {
  kind: NodeKind;
  title: string;
  description: string;
  color: string;
  shape: "rounded" | "pill" | "rectangle" | "circle" | "diamond";
  icon: string;
  tags: string[];
  links: string[];
  collapsed: boolean;
  noteId: string | null;
  taskId: string | null;
  goalId: string | null;
  projectId: string | null;
  habitId: string | null;
  linked?: Linked;
  attachmentCount?: number;
  /** UI-only (never persisted) */
  hiddenDescendants?: number;
  hasChildren?: boolean;
  match?: boolean;
}

export interface RelationEdgeData extends Record<string, unknown> {
  relation: Relation;
  label: string;
  description: string;
  bidirectional: boolean;
}

export type MindNode = Node<MindNodeData>;
export type RelationEdge = Edge<RelationEdgeData>;

export const KIND_META: Record<NodeKind, { label: string; icon: string; color: string }> = {
  THOUGHT: { label: "Thought", icon: "💭", color: "#6366f1" },
  IDEA: { label: "Idea", icon: "💡", color: "#f59e0b" },
  GOAL: { label: "Goal", icon: "🎯", color: "#ef4444" },
  TASK: { label: "Task", icon: "✅", color: "#10b981" },
  PROJECT: { label: "Project", icon: "📦", color: "#8b5cf6" },
  HABIT: { label: "Habit", icon: "🔁", color: "#14b8a6" },
  NOTE: { label: "Note", icon: "📝", color: "#64748b" },
  QUESTION: { label: "Question", icon: "❓", color: "#0ea5e9" },
  DECISION: { label: "Decision", icon: "⚖️", color: "#f97316" },
  RESOURCE: { label: "Resource", icon: "🔗", color: "#3b82f6" },
  MILESTONE: { label: "Milestone", icon: "🏁", color: "#ec4899" },
  GROUP: { label: "Group", icon: "▢", color: "#64748b" },
};

export const RELATION_META: Record<Relation, { label: string; color: string; dashed?: boolean; animated?: boolean }> = {
  RELATED_TO: { label: "Related to", color: "#94a3b8" },
  DEPENDS_ON: { label: "Depends on", color: "#f59e0b", dashed: true },
  SUPPORTS: { label: "Supports", color: "#10b981", animated: true },
  BLOCKS: { label: "Blocks", color: "#ef4444" },
  PART_OF: { label: "Part of", color: "#8b8b96" },
  REQUIRES: { label: "Requires", color: "#f97316", dashed: true },
  CONFLICTS_WITH: { label: "Conflicts with", color: "#dc2626", dashed: true },
  COMBINES_WITH: { label: "Can combine with", color: "#06b6d4" },
  LEADS_TO: { label: "Leads to", color: "#6366f1", animated: true },
};
