import { describe, expect, it } from "vitest";
import { collectGoalTasks, goalProgress, taskProgress } from "@/lib/progress";

describe("goalProgress", () => {
  it("counts milestones and tasks as equal units", () => {
    expect(goalProgress({ autoProgress: true, manualProgress: 0, milestones: [{ done: true }, { done: false }], tasks: [{ status: "DONE" }, { status: "TODO" }] })).toBe(50);
  });
  it("never invents progress for an empty goal", () => {
    expect(goalProgress({ autoProgress: true, manualProgress: 80, milestones: [], tasks: [] })).toBe(0);
  });
  it("uses manual progress when auto is off, clamped", () => {
    expect(goalProgress({ autoProgress: false, manualProgress: 140, milestones: [], tasks: [] })).toBe(100);
  });
  it("is 100 when completed", () => {
    expect(goalProgress({ autoProgress: true, manualProgress: 0, status: "COMPLETED", milestones: [{ done: false }], tasks: [] })).toBe(100);
  });
});

describe("collectGoalTasks", () => {
  it("dedupes tasks linked directly and via projects", () => {
    const t = collectGoalTasks([{ id: "a" }, { id: "b" }], [{ tasks: [{ id: "b" }, { id: "c" }] }]);
    expect(t.map((x) => x.id).sort()).toEqual(["a", "b", "c"]);
  });
});

describe("taskProgress", () => {
  it("computes percent", () => {
    expect(taskProgress([{ status: "DONE" }, { status: "DONE" }, { status: "TODO" }])).toEqual({ total: 3, done: 2, percent: 67 });
    expect(taskProgress([]).percent).toBe(0);
  });
});
