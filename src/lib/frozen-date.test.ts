import { describe, expect, it } from "vitest";
import { formatUsedAt } from "./frozen-date";

describe("formatUsedAt", () => {
  it("formats a used timestamp as a Singapore date and time", () => {
    expect(formatUsedAt("2026-07-10T15:04:00+08:00")).toBe("10-Jul-26 15:04");
  });

  it("returns an em dash for an invalid timestamp", () => {
    expect(formatUsedAt("not-a-date")).toBe("—");
  });
});
