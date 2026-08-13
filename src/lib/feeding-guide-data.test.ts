import { describe, expect, it } from "vitest";
import {
  feedingRanges,
  findFeedingRange,
  nursingRanges,
} from "./feeding-guide-data";

describe("feeding guide age bands", () => {
  it("splits the first six months into three useful bands", () => {
    expect(feedingRanges.slice(2, 5).map((range) => range.label)).toEqual([
      "1–2 months",
      "2–4 months",
      "4–6 months",
    ]);
  });

  it("uses the next band at each age boundary without overlap", () => {
    expect(findFeedingRange(feedingRanges, 28)?.current.label).toBe("1–2 months");
    expect(findFeedingRange(feedingRanges, 60)?.current.label).toBe("2–4 months");
    expect(findFeedingRange(feedingRanges, 120)?.current.label).toBe("4–6 months");
    expect(findFeedingRange(feedingRanges, 180)?.current.label).toBe("6–8 months");
  });

  it("keeps direct-nursing bands aligned with expressed-milk bands", () => {
    expect(nursingRanges.slice(2, 5).map((range) => range.label)).toEqual([
      "1–2 months",
      "2–4 months",
      "4–6 months",
    ]);
  });
});
