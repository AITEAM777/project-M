import { describe, expect, it } from "vitest";
import { PRICES } from "@/lib/plans";

describe("prices", () => {
  it("monthly prices match the plan sheet", () => {
    expect(PRICES.UAH.PRO.month).toBe(449);
    expect(PRICES.UAH.MAX.month).toBe(759);
    expect(PRICES.USD.PRO.month).toBe(9.99);
    expect(PRICES.USD.MAX.month).toBe(16.99);
  });
  it("yearly billing is about 20% cheaper in every currency", () => {
    for (const cur of ["UAH", "USD"] as const) {
      for (const plan of ["PRO", "MAX"] as const) {
        const { month, year } = PRICES[cur][plan];
        const discount = 1 - year / (month * 12);
        expect(discount).toBeGreaterThan(0.19);
        expect(discount).toBeLessThan(0.21);
      }
    }
  });
});
