import { tr } from "@/lib/i18n";
import type { NodeKind, Relation } from "./types";

interface SNode { key: string; kind: NodeKind; title: string; x: number; y: number; icon?: string; color?: string; description?: string }
interface SEdge { from: string; to: string; relation: Relation }
export interface Structure { id: string; icon: string; name: string; hint: string; root: string; nodes: SNode[]; edges: SEdge[] }

/** Ready-made skeletons that can be dropped onto any map (titles are translated at call time). */
export function structures(): Structure[] {
  return [
    {
      id: "startup", icon: "🚀", name: tr("Startup launch"), hint: tr("Problem → customers → solution → MVP → income"), root: "p",
      nodes: [
        { key: "p", kind: "QUESTION", title: tr("Which problem do I solve?"), x: 0, y: 0 },
        { key: "c", kind: "QUESTION", title: tr("Who are my customers?"), x: 320, y: 0 },
        { key: "s", kind: "IDEA", title: tr("My solution"), x: 640, y: 0 },
        { key: "k", kind: "RESOURCE", title: tr("Competitors and alternatives"), x: 640, y: 170 },
        { key: "m", kind: "PROJECT", title: tr("MVP — first version"), x: 960, y: 0, icon: "🛠" },
        { key: "f", kind: "MILESTONE", title: tr("First 10 customers"), x: 1280, y: 0 },
        { key: "r", kind: "GOAL", title: tr("Steady income"), x: 1600, y: 0, icon: "💰" },
      ],
      edges: [
        { from: "p", to: "c", relation: "LEADS_TO" }, { from: "c", to: "s", relation: "LEADS_TO" }, { from: "k", to: "s", relation: "SUPPORTS" },
        { from: "s", to: "m", relation: "LEADS_TO" }, { from: "m", to: "f", relation: "LEADS_TO" }, { from: "f", to: "r", relation: "LEADS_TO" },
      ],
    },
    {
      id: "goal", icon: "🎯", name: tr("Goal → milestones → tasks"), hint: tr("A goal broken into 3 milestones with tasks"), root: "g",
      nodes: [
        { key: "g", kind: "GOAL", title: tr("My goal"), x: 700, y: 160 },
        ...[0, 1, 2].flatMap((i) => [
          { key: `m${i}`, kind: "MILESTONE" as NodeKind, title: tr("Milestone {n}", { n: i + 1 }), x: 360, y: i * 160 },
          { key: `t${i}a`, kind: "TASK" as NodeKind, title: tr("Task"), x: 0, y: i * 160 - 42 },
          { key: `t${i}b`, kind: "TASK" as NodeKind, title: tr("Task"), x: 0, y: i * 160 + 42 },
        ]),
      ],
      edges: [0, 1, 2].flatMap((i) => [
        { from: `m${i}`, to: "g", relation: "LEADS_TO" as Relation },
        { from: `t${i}a`, to: `m${i}`, relation: "SUPPORTS" as Relation },
        { from: `t${i}b`, to: `m${i}`, relation: "SUPPORTS" as Relation },
      ]),
    },
    {
      id: "swot", icon: "🧭", name: tr("SWOT analysis"), hint: tr("Strengths, weaknesses, opportunities, threats"), root: "c",
      nodes: [
        { key: "c", kind: "THOUGHT", title: tr("SWOT: my idea"), x: 0, y: 0, icon: "🧭" },
        { key: "s", kind: "THOUGHT", title: tr("Strengths"), x: -340, y: -160, icon: "💪", color: "#12a150" },
        { key: "w", kind: "THOUGHT", title: tr("Weaknesses"), x: 340, y: -160, icon: "⚠️", color: "#d97706" },
        { key: "o", kind: "THOUGHT", title: tr("Opportunities"), x: -340, y: 160, icon: "🌱", color: "#0ea5e9" },
        { key: "t", kind: "THOUGHT", title: tr("Threats"), x: 340, y: 160, icon: "⛈️", color: "#dc2626" },
      ],
      edges: ["s", "w", "o", "t"].map((k) => ({ from: k, to: "c", relation: "PART_OF" as Relation })),
    },
    {
      id: "decision", icon: "⚖️", name: tr("Decision: pros and cons"), hint: tr("Two options with their pros and cons"), root: "d",
      nodes: [
        { key: "d", kind: "DECISION", title: tr("What should I decide?"), x: 0, y: 0 },
        { key: "a", kind: "IDEA", title: tr("Option A"), x: -300, y: 170 },
        { key: "b", kind: "IDEA", title: tr("Option B"), x: 300, y: 170 },
        { key: "ap", kind: "THOUGHT", title: tr("Pros"), x: -440, y: 340, icon: "➕", color: "#12a150" },
        { key: "am", kind: "THOUGHT", title: tr("Cons"), x: -160, y: 340, icon: "➖", color: "#dc2626" },
        { key: "bp", kind: "THOUGHT", title: tr("Pros"), x: 160, y: 340, icon: "➕", color: "#12a150" },
        { key: "bm", kind: "THOUGHT", title: tr("Cons"), x: 440, y: 340, icon: "➖", color: "#dc2626" },
      ],
      edges: [
        { from: "a", to: "d", relation: "LEADS_TO" }, { from: "b", to: "d", relation: "LEADS_TO" },
        { from: "ap", to: "a", relation: "SUPPORTS" }, { from: "am", to: "a", relation: "CONFLICTS_WITH" },
        { from: "bp", to: "b", relation: "SUPPORTS" }, { from: "bm", to: "b", relation: "CONFLICTS_WITH" },
      ],
    },
    {
      id: "why", icon: "🔍", name: tr("5 whys: find the root cause"), hint: tr("Problem → why? → why? → root cause → action"), root: "p",
      nodes: [
        { key: "p", kind: "QUESTION", title: tr("What is the problem?"), x: 0, y: 0 },
        { key: "w1", kind: "QUESTION", title: tr("Why?"), x: 0, y: 130 },
        { key: "w2", kind: "QUESTION", title: tr("Why?"), x: 0, y: 260 },
        { key: "w3", kind: "QUESTION", title: tr("Why?"), x: 0, y: 390 },
        { key: "r", kind: "IDEA", title: tr("Root cause"), x: 0, y: 520, icon: "🌱" },
        { key: "a", kind: "TASK", title: tr("What I will do about it"), x: 0, y: 650 },
      ],
      edges: [
        { from: "p", to: "w1", relation: "LEADS_TO" }, { from: "w1", to: "w2", relation: "LEADS_TO" }, { from: "w2", to: "w3", relation: "LEADS_TO" },
        { from: "w3", to: "r", relation: "LEADS_TO" }, { from: "r", to: "a", relation: "LEADS_TO" },
      ],
    },
  ];
}

/** Bounding box centre of a structure (used to place it under the viewport centre). */
export function structureCenter(s: Structure) {
  const xs = s.nodes.map((n) => n.x), ys = s.nodes.map((n) => n.y);
  return { x: (Math.min(...xs) + Math.max(...xs) + 220) / 2, y: (Math.min(...ys) + Math.max(...ys) + 60) / 2 };
}
