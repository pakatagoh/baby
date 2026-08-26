import { describe, expect, it } from "vitest";
import type { MilkSheetEntry } from "@/lib/sheets";
import { getDailyEventData, getMonthlyEventData, combineMonthlyEventData } from "./stats-data";

function entry(overrides: Partial<MilkSheetEntry>): MilkSheetEntry {
  return {
    id: "entry",
    frozenAt: "2026-07-06T10:00:00Z",
    amount: 100,
    packets: 1,
    totalFrozen: 1,
    totalUsed: 0,
    notes: "",
    imageUrl: "",
    createdAt: "",
    updatedAt: "",
    used: false,
    usedAt: "",
    ...overrides,
  };
}

describe("used milk chart data", () => {
  it("groups used amounts by the date they were marked used", () => {
    const monday = new Date("2026-07-06T00:00:00Z");
    const entries = [
      entry({ amount: 120, used: true, usedAt: "2026-07-06T09:00:00Z" }),
      entry({ amount: 80, used: true, usedAt: "2026-07-08T09:00:00Z" }),
      entry({ amount: 200, used: false, frozenAt: "2026-07-07T09:00:00Z" }),
    ];

    expect(getDailyEventData(entries, monday, "used")).toEqual([
      { day: "Mon", label: "Mon 6/7", ml: 120 },
      { day: "Tue", label: "Tue 7/7", ml: 0 },
      { day: "Wed", label: "Wed 8/7", ml: 80 },
      { day: "Thu", label: "Thu 9/7", ml: 0 },
      { day: "Fri", label: "Fri 10/7", ml: 0 },
      { day: "Sat", label: "Sat 11/7", ml: 0 },
      { day: "Sun", label: "Sun 12/7", ml: 0 },
    ]);
  });

  it("falls back to the frozen date for legacy used entries without usedAt", () => {
    const monday = new Date("2026-07-06T00:00:00Z");
    expect(
      getDailyEventData(
        [entry({ amount: 90, used: true, usedAt: "", frozenAt: "2026-07-07T10:00:00Z" })],
        monday,
        "used",
      )[1].ml,
    ).toBe(90);
  });

  it("falls back to the frozen date when usedAt is malformed", () => {
    const monday = new Date("2026-07-06T00:00:00Z");
    expect(
      getDailyEventData(
        [entry({ amount: 75, used: true, usedAt: "not-a-date", frozenAt: "2026-07-08T10:00:00Z" })],
        monday,
        "used",
      )[2].ml,
    ).toBe(75);
  });

  it("groups used amounts by month for the selected half-year", () => {
    const entries = [
      entry({ amount: 100, used: true, usedAt: "2026-07-08T09:00:00Z" }),
      entry({ amount: 50, used: true, usedAt: "2026-08-01T09:00:00Z" }),
    ];

    expect(getMonthlyEventData(entries, -0, new Date("2026-07-15T00:00:00Z"), "used")).toEqual([
      { month: "Jul", ml: 100 },
      { month: "Aug", ml: 50 },
      { month: "Sep", ml: 0 },
      { month: "Oct", ml: 0 },
      { month: "Nov", ml: 0 },
      { month: "Dec", ml: 0 },
    ]);
  });

  it("combines frozen and used monthly series without changing either value", () => {
    expect(
      combineMonthlyEventData(
        [{ month: "Jul", ml: 300 }, { month: "Aug", ml: 200 }],
        [{ month: "Jul", ml: 100 }, { month: "Aug", ml: 150 }],
      ),
    ).toEqual([
      { month: "Jul", frozen: 300, used: 100 },
      { month: "Aug", frozen: 200, used: 150 },
    ]);
  });
});
