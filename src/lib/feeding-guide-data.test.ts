import { describe, expect, it } from "vitest";
import {
  feedingRanges,
  findFeedingRange,
  nursingRanges,
} from "./feeding-guide-data";

describe("feeding guide age bands", () => {
  it("uses one cautious starting range for expressed milk from 1–6 months", () => {
    const range = feedingRanges.find((item) => item.label === "1–6 months");

    expect(range).toMatchObject({
      minDays: 28,
      maxDays: 180,
      perFeedMin: 60,
      perFeedMax: 120,
    });
    expect(range?.guidance).toContain("Starting range");
    expect(range?.interval).toBe("Often every 2–4 hours; follow cues.");
    expect(range).not.toHaveProperty("feedsMin");
    expect(range).not.toHaveProperty("dailyTotal");
  });

  it("provides newborn intervals without turning them into rigid schedules", () => {
    expect(feedingRanges[0].interval).toBe("Offer about every 2–3 hours.");
    expect(feedingRanges[1].interval).toBe("Often every 2–3 hours; follow cues.");
  });

  it("uses the next band at each age boundary without overlap", () => {
    expect(findFeedingRange(feedingRanges, 28)?.current.label).toBe("1–6 months");
    expect(findFeedingRange(feedingRanges, 179)?.current.label).toBe("1–6 months");
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
