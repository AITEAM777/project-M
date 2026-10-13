import { describe, expect, it } from "vitest";
import { expandRecurring, findConflicts, minutesByGoal, suggestSlots, type TimeBlock } from "@/lib/schedule";

const at = (d: string) => new Date(d);
const block = (id: string, s: string, e: string, extra: Partial<TimeBlock> = {}): TimeBlock => ({ id, title: id, start: at(s), end: at(e), ...extra });

describe("findConflicts", () => {
  it("detects overlapping blocks and overlap minutes", () => {
    const c = findConflicts([block("run", "2026-01-05T07:00", "2026-01-05T08:00"), block("call", "2026-01-05T07:30", "2026-01-05T08:30"), block("work", "2026-01-05T09:00", "2026-01-05T17:00")]);
    expect(c).toHaveLength(1);
    expect(c[0].overlapMinutes).toBe(30);
  });
  it("treats touching blocks as not conflicting and ignores all-day", () => {
    expect(findConflicts([block("a", "2026-01-05T07:00", "2026-01-05T08:00"), block("b", "2026-01-05T08:00", "2026-01-05T09:00")])).toHaveLength(0);
    expect(findConflicts([block("a", "2026-01-05T00:00", "2026-01-06T00:00", { allDay: true }), block("b", "2026-01-05T08:00", "2026-01-05T09:00")])).toHaveLength(0);
  });
  it("reports every pair in a triple overlap", () => {
    expect(findConflicts([block("a", "2026-01-05T07:00", "2026-01-05T10:00"), block("b", "2026-01-05T08:00", "2026-01-05T09:00"), block("c", "2026-01-05T08:30", "2026-01-05T09:30")])).toHaveLength(3);
  });
});

describe("suggestSlots", () => {
  it("finds the first free slots after busy time", () => {
    const busy = [block("a", "2026-01-05T07:00", "2026-01-05T09:00")];
    const s = suggestSlots(busy, at("2026-01-05T12:00"), 60, { limit: 2 });
    expect(s[0].start.getHours()).toBe(9);
    expect(s[1].start.getHours()).toBe(10);
  });
  it("returns nothing when the day is full", () => {
    expect(suggestSlots([block("a", "2026-01-05T06:00", "2026-01-05T23:00")], at("2026-01-05T12:00"), 30)).toHaveLength(0);
  });
});

describe("expandRecurring", () => {
  it("expands weekly events inside the range", () => {
    const r = expandRecurring([{ ...block("gym", "2026-01-05T07:00", "2026-01-05T08:00"), recurrence: "WEEKLY" }], at("2026-01-01"), at("2026-02-01"));
    expect(r.map((x) => x.start.getDate())).toEqual([5, 12, 19, 26]);
  });
  it("respects recurUntil and skips weekends for WEEKDAYS", () => {
    const r = expandRecurring([{ ...block("x", "2026-01-09T09:00", "2026-01-09T10:00"), recurrence: "WEEKDAYS", recurUntil: at("2026-01-13") }], at("2026-01-01"), at("2026-02-01"));
    expect(r.map((x) => x.start.getDay())).toEqual([5, 1, 2]);
  });
});

describe("minutesByGoal", () => {
  it("credits an activity to every goal it supports", () => {
    const m = minutesByGoal([block("walk+podcast", "2026-01-05T07:00", "2026-01-05T07:45", { goalIds: ["fitness", "learning"] })]);
    expect(m.get("fitness")).toBe(45);
    expect(m.get("learning")).toBe(45);
  });
});
