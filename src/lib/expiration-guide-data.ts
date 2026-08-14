export interface ExpirationGuideItem {
  stage: string;
  storage: string;
  interval: string;
  warning?: string;
}

/** Expressed breast-milk storage guidance transcribed from the household guide. */
export const expirationGuide: ExpirationGuideItem[] = [
  { stage: "Fresh", storage: "Room temperature", interval: "4 hrs" },
  { stage: "Fresh", storage: "Fridge", interval: "4 days" },
  { stage: "Fresh", storage: "Fridge → room / warmed", interval: "24 hrs" },
  { stage: "Fresh", storage: "Freezer", interval: "3–6 months" },
  { stage: "Frozen", storage: "Fridge (completely thawed)", interval: "24 hrs" },
  { stage: "Frozen", storage: "Fridge warmed", interval: "24 hrs" },
  {
    stage: "Any milk",
    storage: "Once baby starts drinking",
    interval: "Use within 2 hrs",
  },
  {
    stage: "Important",
    storage: "Thawed milk",
    interval: "Do not refreeze",
    warning: "Do not refreeze thawed milk.",
  },
];
