import { afterEach, describe, expect, it } from "vitest";
import { setLocale, tp, tr } from "@/lib/i18n";
import { uk } from "@/lib/i18n/uk";
import { TOURS, tourFor } from "@/components/tour/tours";

afterEach(() => setLocale("en"));

describe("i18n", () => {
  it("returns English source by default and Ukrainian when switched", () => {
    expect(tr("Mind map")).toBe("Mind map");
    setLocale("uk");
    expect(tr("Mind map")).toBe("Карта думок");
    expect(tr("Some untranslated text")).toBe("Some untranslated text");
  });

  it("interpolates variables", () => {
    setLocale("uk");
    expect(tr("Step {a} of {b}", { a: 2, b: 5 })).toMatch(/2.*5/);
  });

  it("uses three Ukrainian plural forms", () => {
    setLocale("uk");
    expect(tp(1, "# task", "# tasks")).toBe("1 задача");
    expect(tp(3, "# task", "# tasks")).toBe("3 задачі");
    expect(tp(5, "# task", "# tasks")).toBe("5 задач");
    expect(tp(12, "# task", "# tasks")).toBe("12 задач");
    expect(tp(21, "# task", "# tasks")).toBe("21 задача");
    setLocale("en");
    expect(tp(1, "# task", "# tasks")).toBe("1 task");
  });

  it("keeps placeholders intact in translations", () => {
    for (const [k, v] of Object.entries(uk)) {
      const ph = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort().join();
      expect(ph(v), k).toBe(ph(k));
    }
  });
});

describe("tours", () => {
  it("every step has English and Ukrainian text", () => {
    for (const t of TOURS) for (const s of t.steps) {
      expect(s.title.en && s.title.uk && s.body.en && s.body.uk, `${t.id}`).toBeTruthy();
    }
  });

  it("maps routes to page tours", () => {
    expect(tourFor("/maps/abc")?.id).toBe("map");
    expect(tourFor("/dashboard")?.id).toBe("dashboard");
  });
});
