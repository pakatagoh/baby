import { describe, expect, it } from "vitest";
import type { MilkSheetEntry } from "./sheets";
import { daysUntilExpiry, getExpiryDate, getExpiryMonth, getExpiryMs } from "./expiry";

export function milkEntry(frozenAt: string, overrides: Partial<MilkSheetEntry> = {}): MilkSheetEntry {
  return { id: "test-packet", frozenAt, amount: 100, packets: 1, totalFrozen: 1,
    totalUsed: 0, notes: "", imageUrl: "", createdAt: "", updatedAt: "",
    used: false, usedAt: "", ...overrides };
}

describe("dedicated freezer expiry", () => {
  it("preserves the frozen time in expiry instants and countdowns", () => {
    const entry = milkEntry("2026-07-01T00:30:45+08:00");
    const expiry = Date.parse("2027-01-01T00:30:45+08:00");
    expect(getExpiryMs(entry)).toBe(expiry);
    expect(daysUntilExpiry(entry, expiry - 24 * 60 * 60 * 1000)).toBe(1);
    expect(daysUntilExpiry(entry, expiry)).toBe(0);
    expect(daysUntilExpiry(entry, expiry + 24 * 60 * 60 * 1000)).toBe(-1);
  });
  it("expires six calendar months after freezing, including across years", () => {
    const entry = milkEntry("2026-07-16T10:30:00+08:00");
    expect(getExpiryDate(entry)).toBe("16-Jan-27");
    expect(getExpiryMonth(entry)).toBe("Jan-27");
  });
  it("uses the Singapore date even near midnight", () => {
    expect(getExpiryDate(milkEntry("2026-07-01T00:30:00+08:00"))).toBe("01-Jan-27");
  });
  it("clamps month-end expiry to the last day of the target month", () => {
    expect(getExpiryDate(milkEntry("2026-08-31T10:30:00+08:00"))).toBe("28-Feb-27");
    expect(getExpiryDate(milkEntry("2027-08-31T10:30:00+08:00"))).toBe("29-Feb-28");
  });
  it("preserves explicit month offsets", () => {
    expect(getExpiryDate(milkEntry("2026-07-16T10:30:00+08:00"), 3)).toBe("16-Oct-26");
  });
  it("does not invent an expiry for malformed dates", () => {
    expect(getExpiryDate(milkEntry("invalid"))).toBeNull();
    expect(getExpiryMonth(milkEntry("invalid"))).toBeNull();
  });
});
