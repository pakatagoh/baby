import { describe, expect, it } from "vitest";
import type { MilkSheetEntry } from "@/lib/sheets";
import type { FilterState } from "./FilterModal";
import { filterStorageEntries, getStorageTabCounts } from "./storage-filtering";

const noFilter: FilterState = {
  dateStart: "",
  dateEnd: "",
  amountOp: "eq",
  amountVal: "",
};

function entry(overrides: Partial<MilkSheetEntry>): MilkSheetEntry {
  return {
    id: "entry",
    frozenAt: "2026-07-10T10:00:00+08:00",
    amount: 100,
    packets: 1,
    totalFrozen: 1,
    totalUsed: 0,
    notes: "",
    imageUrl: "",
    createdAt: "2026-07-10T10:00:00+08:00",
    updatedAt: "",
    used: false,
    usedAt: "",
    ...overrides,
  };
}

const entries = [
  entry({ id: "frozen-in-range", amount: 100 }),
  entry({ id: "used-in-range", amount: 120, used: true, totalFrozen: 0, totalUsed: 1 }),
  entry({ id: "frozen-outside-range", frozenAt: "2026-07-20T10:00:00+08:00", amount: 120 }),
];

describe("storage filtering", () => {
  it("returns tab counts from the entries matching an inclusive date range", () => {
    const filteredEntries = filterStorageEntries(entries, {
      ...noFilter,
      dateStart: "2026-07-10",
      dateEnd: "2026-07-10",
    });

    expect(getStorageTabCounts(filteredEntries)).toEqual({ all: 2, frozen: 1, used: 1 });
  });

  it("returns tab counts from entries matching the amount filter", () => {
    const filteredEntries = filterStorageEntries(entries, {
      ...noFilter,
      amountOp: "gte",
      amountVal: "120",
    });

    expect(getStorageTabCounts(filteredEntries)).toEqual({ all: 2, frozen: 1, used: 1 });
  });

  it("returns zero for every tab when filters match no entries", () => {
    const filteredEntries = filterStorageEntries(entries, {
      ...noFilter,
      amountVal: "999",
    });

    expect(getStorageTabCounts(filteredEntries)).toEqual({ all: 0, frozen: 0, used: 0 });
  });
});
