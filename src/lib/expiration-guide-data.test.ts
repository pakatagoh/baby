import { describe, expect, it } from "vitest";
import { expirationGuide } from "./expiration-guide-data";

describe("expressed milk expiration guide", () => {
  it("contains the transcribed storage intervals", () => {
    expect(
      expirationGuide
        .filter((item) => !item.warning)
        .map((item) => [item.stage, item.storage, item.interval]),
    ).toEqual([
      ["Fresh", "Room temperature", "4 hrs"],
      ["Fresh", "Fridge", "4 days"],
      ["Fresh", "Fridge → room / warmed", "24 hrs"],
      ["Fresh", "Freezer", "3–6 months"],
      ["Frozen", "Fridge (completely thawed)", "24 hrs"],
      ["Frozen", "Fridge warmed", "24 hrs"],
      ["Any milk", "Once baby starts drinking", "Use within 2 hrs"],
    ]);
  });

  it("includes the no-refreezing warning", () => {
    expect(expirationGuide.some((item) => item.warning)).toBe(true);
  });
});
