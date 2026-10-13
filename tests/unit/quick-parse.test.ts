import { describe, expect, it } from "vitest";
import { blockOf, quickParse } from "@/lib/nlp/quick-parse";

// Tuesday, 13 Oct 2026, 15:20
const now = new Date(2026, 9, 13, 15, 20);
const goals = [{ id: "g1", title: "Пробігти напівмарафон" }, { id: "g2", title: "Learn English to B2" }];
const ymd = (d: Date | null) => (d ? `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}` : null);

describe("quickParse (uk)", () => {
  it("parses the showcase phrase", () => {
    const p = quickParse("завтра о 9 пробіжка 5 км, прив'язати до цілі марафон, щотижня", { now, goals });
    expect(p.kind).toBe("task");
    expect(p.title).toBe("Пробіжка 5 км");
    expect(ymd(p.date)).toBe("2026-10-14");
    expect(p.time).toBe(9 * 60);
    expect(p.recurrence).toBe("WEEKLY");
    expect(p.goal?.id).toBe("g1");
    expect(p.signals).toBeGreaterThanOrEqual(4);
  });

  it("handles ranges, durations and weekdays", () => {
    const p = quickParse("в п’ятницю з 18:30 до 20 зустріч з друзями", { now });
    expect(ymd(p.date)).toBe("2026-10-16");
    expect(p.time).toBe(18 * 60 + 30);
    expect(p.endTime).toBe(20 * 60);
    expect(p.title).toBe("Зустріч з друзями");
    const b = blockOf(p)!;
    expect(b.end.getTime() - b.start.getTime()).toBe(90 * 60_000);
    expect(quickParse("прочитати розділ 45 хв сьогодні", { now }).duration).toBe(45);
    expect(quickParse("прибрати в гаражі на 1,5 год", { now }).duration).toBe(90);
  });

  it("detects explicit kinds, goal deadlines and habits", () => {
    const g = quickParse("нова ціль вивчити англійську до червня", { now });
    expect(g.kind).toBe("goal");
    expect(g.title).toBe("Вивчити англійську");
    expect(ymd(g.date)).toBe("2027-6-30");
    const h = quickParse("звичка: вода 2 л щодня, нагадати о 12", { now });
    expect(h.kind).toBe("habit");
    expect(h.title).toBe("Вода 2 л");
    expect(h.recurrence).toBe("DAILY");
    expect(h.reminder).toBe("12:00");
  });

  it("time only → today if still ahead, else tomorrow", () => {
    expect(ymd(quickParse("подзвонити мамі о 19", { now }).date)).toBe("2026-10-13");
    expect(ymd(quickParse("подзвонити мамі о 8 ранку", { now }).date)).toBe("2026-10-14");
    expect(quickParse("о 7 вечора спортзал", { now }).time).toBe(19 * 60);
  });

  it("reads dates, priority and tags", () => {
    const p = quickParse("здати звіт 20 жовтня терміново #робота", { now });
    expect(ymd(p.date)).toBe("2026-10-20");
    expect(p.priority).toBe("URGENT");
    expect(p.tags).toEqual(["робота"]);
    expect(p.title).toBe("Здати звіт");
    expect(ymd(quickParse("оплатити 05.11", { now }).date)).toBe("2026-11-5");
    expect(p.recurrence).toBeNull();
  });

  it("plain search text has no signals", () => {
    const p = quickParse("тренування", { now });
    expect(p.signals).toBe(0);
    expect(p.title).toBe("Тренування");
  });
});

describe("quickParse (en)", () => {
  it("parses English phrases", () => {
    const p = quickParse("tomorrow at 6pm gym for 1 hour, for goal english", { now, goals });
    expect(ymd(p.date)).toBe("2026-10-14");
    expect(p.time).toBe(18 * 60);
    expect(p.duration).toBe(60);
    expect(p.goal?.id).toBe("g2");
    expect(p.title).toBe("Gym");
    const w = quickParse("standup every weekday at 10:00", { now });
    expect(w.recurrence).toBe("WEEKDAYS");
    expect(w.time).toBe(600);
    expect(w.title).toBe("Standup");
    expect(ymd(quickParse("call bank next friday", { now }).date)).toBe("2026-10-16");
  });
});
