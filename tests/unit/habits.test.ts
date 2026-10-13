import { describe, expect, it } from "vitest";
import { dayKey, habitStats } from "@/lib/habits";

const today = new Date(2026, 0, 15); // Thu
const key = (offset: number) => { const d = new Date(today); d.setDate(d.getDate() + offset); return dayKey(d); };

describe("habitStats (daily)", () => {
  it("counts the current streak including today", () => {
    const s = habitStats({ frequency: "DAILY", targetPerPeriod: 1 }, { [key(0)]: 1, [key(-1)]: 1, [key(-2)]: 1, [key(-4)]: 1 }, today);
    expect(s.streak).toBe(3);
    expect(s.best).toBe(3);
  });
  it("keeps yesterday's streak alive before today is logged", () => {
    expect(habitStats({ frequency: "DAILY", targetPerPeriod: 1 }, { [key(-1)]: 1, [key(-2)]: 1 }, today).streak).toBe(2);
  });
  it("requires the target count", () => {
    expect(habitStats({ frequency: "DAILY", targetPerPeriod: 2 }, { [key(0)]: 1 }, today).streak).toBe(0);
  });
});

describe("habitStats (weekly)", () => {
  it("sums completions per Monday-based week", () => {
    const s = habitStats({ frequency: "WEEKLY", targetPerPeriod: 3 }, { [key(-3)]: 1, [key(-2)]: 1, [key(0)]: 1, [key(-7)]: 3 }, today);
    expect(s.doneThisWeek).toBe(3);
    expect(s.streak).toBe(2);
  });
});
