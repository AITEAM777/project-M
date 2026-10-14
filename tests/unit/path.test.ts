import { describe, expect, it } from "vitest";
import { pathToGoal } from "@/components/canvas/path";
import type { MindNode, RelationEdge } from "@/components/canvas/types";

const node = (id: string, kind = "THOUGHT", extra: Partial<MindNode["data"]> = {}) =>
  ({ id, type: "mind", position: { x: 0, y: 0 }, data: { kind, title: id, description: "", color: "", shape: "rounded", icon: "", tags: [], links: [], collapsed: false, noteId: null, taskId: null, goalId: null, projectId: null, habitId: null, ...extra } }) as MindNode;
const edge = (source: string, target: string, relation = "LEADS_TO") => ({ id: `${source}-${target}`, source, target, data: { relation, label: "", description: "", bidirectional: false } }) as RelationEdge;

describe("pathToGoal", () => {
  // learn → apps → startup → income; question requires startup; interviews support the question; a side idea is only "related".
  const nodes = [node("learn", "GOAL"), node("apps", "PROJECT"), node("startup", "PROJECT"), node("income", "GOAL"), node("q", "QUESTION"), node("interviews", "RESOURCE"), node("side")];
  const edges = [edge("learn", "apps"), edge("apps", "startup"), edge("startup", "income"), edge("q", "startup", "REQUIRES"), edge("interviews", "q", "SUPPORTS"), edge("side", "income", "RELATED_TO")];

  it("collects everything upstream in prerequisite order and ignores neutral links", () => {
    const p = pathToGoal("income", nodes, edges);
    expect([...p.ids].sort()).toEqual(["apps", "income", "interviews", "learn", "q", "startup"]);
    expect(p.steps.map((s) => s.id).slice(0, 2)).toEqual(expect.arrayContaining(["learn"]));
    expect(p.steps.at(-1)?.id).toBe("startup");
    expect(p.edges.has("side-income")).toBe(false);
  });

  it("flags an unanswered question as the next blocker, and clears it once answered", () => {
    let p = pathToGoal("income", nodes, edges);
    expect(p.steps.find((s) => s.id === "q")?.state).toBe("blocked");
    expect(p.next?.id).toBe("q");
    const answered = nodes.map((n) => (n.id === "q" ? node("q", "QUESTION", { description: "Founders waste hours on notes" }) : n));
    p = pathToGoal("income", answered, edges);
    expect(p.steps.find((s) => s.id === "q")?.state).toBe("done");
  });

  it("treats 'depends on' as reversed and honours BLOCKS arrows", () => {
    const p = pathToGoal("b", [node("a"), node("b", "TASK"), node("c", "TASK")], [edge("b", "a", "DEPENDS_ON"), edge("c", "b", "BLOCKS")]);
    expect(p.ids.has("a")).toBe(true);
    expect(p.goal.state).toBe("blocked");
    expect(p.goal.blockers.map((n) => n.id)).toEqual(["c"]);
  });

  it("survives cycles", () => {
    const p = pathToGoal("x", [node("x"), node("y")], [edge("x", "y"), edge("y", "x")]);
    expect(p.ids.size).toBe(2);
  });
});
