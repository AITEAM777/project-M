import { describe, expect, it } from "vitest";
import { computeHidden, descendants } from "@/components/canvas/graph-utils";
import type { MindNode, RelationEdge } from "@/components/canvas/types";

const n = (id: string, collapsed = false) => ({ id, position: { x: 0, y: 0 }, data: { collapsed } }) as unknown as MindNode;
const e = (s: string, t: string) => ({ id: `${s}-${t}`, source: s, target: t }) as RelationEdge;

describe("canvas graph utils", () => {
  it("collects descendants safely through cycles", () => {
    expect([...descendants("a", [e("a", "b"), e("b", "c"), e("c", "a")])].sort()).toEqual(["b", "c"]);
  });
  it("hides a collapsed branch but keeps nodes reachable from elsewhere", () => {
    const nodes = [n("root"), n("a", true), n("b"), n("c"), n("x")];
    const edges = [e("root", "a"), e("a", "b"), e("b", "c"), e("x", "c")];
    const { hidden, counts } = computeHidden(nodes, edges);
    expect([...hidden]).toEqual(["b"]);
    expect(counts.get("a")).toBe(2);
  });
});
