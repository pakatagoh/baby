import { describe, expect, it } from "vitest";
import { getActivityRowIndexes } from "./activity-log";

describe("getActivityRowIndexes", () => {
  it("returns physical app-event sheet rows for every matching frozen-milk ID", () => {
    const rows = [
      ["event-1", "2026-07-27T10:00:00+08:00", "milk_frozen", "entry-a"],
      ["event-2", "2026-07-27T11:00:00+08:00", "entry_used", "entry-b"],
      ["event-3", "2026-07-27T12:00:00+08:00", "entry_unused", "entry-a"],
    ];

    expect(getActivityRowIndexes(rows, "entry-a")).toEqual([2, 4]);
  });

  it("returns no rows when the frozen-milk entry has no activity", () => {
    expect(getActivityRowIndexes([], "missing-entry")).toEqual([]);
  });
});
