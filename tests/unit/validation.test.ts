import { describe, expect, it } from "vitest";
import { eventCreate, graphSave, registerSchema, taskCreate } from "@/lib/validation";
import { limitsFor } from "@/lib/plans";

describe("validation", () => {
  it("rejects short passwords and bad emails", () => {
    expect(registerSchema.safeParse({ name: "A", email: "nope", password: "123" }).success).toBe(false);
    expect(registerSchema.parse({ name: " A ", email: "X@Y.COM", password: "12345678" }).email).toBe("x@y.com");
  });
  it("requires a task title", () => {
    expect(taskCreate.safeParse({ title: "  " }).success).toBe(false);
  });
  it("requires event end after start", () => {
    expect(eventCreate.safeParse({ title: "x", start: "2026-01-01T10:00:00Z", end: "2026-01-01T09:00:00Z" }).success).toBe(false);
  });
  it("applies node defaults in graph saves", () => {
    const g = graphSave.parse({ nodes: [{ id: "n1", kind: "IDEA", title: "x", x: 1, y: 2 }], edges: [{ id: "e1", sourceId: "n1", targetId: "n1" }] });
    expect(g.nodes[0].shape).toBe("rounded");
    expect(g.edges[0].relation).toBe("RELATED_TO");
  });
  it("plan limits fall back to FREE", () => {
    expect(limitsFor("UNKNOWN").activeMindMaps).toBe(limitsFor("FREE").activeMindMaps);
    expect(limitsFor("PRO").activeMindMaps).toBe(Infinity);
  });
});
