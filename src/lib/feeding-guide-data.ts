/**
 * Structured feeding guide data for expressed breastmilk (bottle).
 *
 * Source: FEEDING_GUIDE.md at project root.
 * All values are averages — feed on demand.
 */

export interface FeedingRange {
  /** Human-readable label: "5 days – 4 weeks" */
  label: string;
  /** Minimum age in days (inclusive) */
  minDays: number;
  /** Maximum age in days (exclusive) */
  maxDays: number | null;
  /** Per-feed amount range in ml */
  perFeedMin: number;
  perFeedMax: number;
  /** Practical guidance shown with the starting amount */
  guidance: string;
  /** Solids guidance, if any */
  solids: string | null;
}

/** Expressed breastmilk via bottle. */
export const feedingRanges: FeedingRange[] = [
  {
    label: "0–5 days",
    minDays: 0,
    maxDays: 5,
    perFeedMin: 30,
    perFeedMax: 45,
    guidance: "Offer frequently and follow hunger and fullness cues.",
    solids: null,
  },
  {
    label: "5 days – 4 weeks",
    minDays: 5,
    maxDays: 28,
    perFeedMin: 45,
    perFeedMax: 90,
    guidance: "Offer when hungry; avoid forcing a bottle to be finished.",
    solids: null,
  },
  {
    label: "1–6 months",
    minDays: 28,
    maxDays: 180,
    perFeedMin: 60,
    perFeedMax: 120,
    guidance:
      "Starting range only. Some babies take less or more, and may feed more frequently. Follow hunger and fullness cues rather than a daily target.",
    solids: null,
  },
  {
    label: "6–8 months",
    minDays: 180,
    maxDays: 240,
    perFeedMin: 90,
    perFeedMax: 120,
    guidance: "Offer breastmilk before solids and follow hunger and fullness cues.",
    solids:
      "Cereal 5–8 tbsp · Veg 2–3 tbsp ×2 · Fruit 2–3 tbsp ×2 · Meat 1–2 tbsp ×2",
  },
  {
    label: "8–10 months",
    minDays: 240,
    maxDays: 300,
    perFeedMin: 90,
    perFeedMax: 135,
    guidance: "Milk needs vary as solids increase; continue responsive feeding.",
    solids: "Increasing table foods + finger foods",
  },
  {
    label: "10–12 months",
    minDays: 300,
    maxDays: 365,
    perFeedMin: 90,
    perFeedMax: 135,
    guidance: "Offer breastmilk before solids and follow hunger and fullness cues.",
    solids:
      "Cereal 5–8 tbsp · Veg 2–4 tbsp ×2 · Fruit 2–4 tbsp ×2 · Protein 2–3 tbsp ×2",
  },
  {
    label: "12–24 months",
    minDays: 365,
    maxDays: 730,
    perFeedMin: 90,
    perFeedMax: 135,
    guidance: "Focus on responsive feeding and a balanced solid-food diet.",
    solids:
      "Focus on balanced solid-food diet. Switch to whole cow's milk if weaning.",
  },
];

/** Direct breastfeeding — feeds per day by age. */
export interface NursingRange {
  label: string;
  minDays: number;
  maxDays: number | null;
  feedsMin: number;
  feedsMax: number;
  solids: string | null;
}

export const nursingRanges: NursingRange[] = [
  { label: "0–5 days", minDays: 0, maxDays: 5, feedsMin: 10, feedsMax: 12, solids: null },
  { label: "5 days – 4 weeks", minDays: 5, maxDays: 28, feedsMin: 8, feedsMax: 12, solids: null },
  { label: "1–2 months", minDays: 28, maxDays: 60, feedsMin: 6, feedsMax: 10, solids: null },
  { label: "2–4 months", minDays: 60, maxDays: 120, feedsMin: 6, feedsMax: 8, solids: null },
  { label: "4–6 months", minDays: 120, maxDays: 180, feedsMin: 5, feedsMax: 8, solids: null },
  {
    label: "6–8 months",
    minDays: 180,
    maxDays: 240,
    feedsMin: 5,
    feedsMax: 8,
    solids: "Cereal 5–8 tbsp · Veg 2–3 tbsp ×2 · Fruit 2–3 tbsp ×2 · Meat 1–2 tbsp ×2",
  },
  {
    label: "8–10 months",
    minDays: 240,
    maxDays: 300,
    feedsMin: 4,
    feedsMax: 6,
    solids: "Increasing table foods + finger foods",
  },
  {
    label: "10–12 months",
    minDays: 300,
    maxDays: 365,
    feedsMin: 4,
    feedsMax: 6,
    solids: "Cereal 5–8 tbsp · Veg 2–4 tbsp ×2 · Fruit 2–4 tbsp ×2 · Protein 2–3 tbsp ×2",
  },
  { label: "12–24 months", minDays: 365, maxDays: 730, feedsMin: 2, feedsMax: 6, solids: null },
  { label: "24–36 months", minDays: 730, maxDays: 1095, feedsMin: 1, feedsMax: 3, solids: null },
];

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Compute baby age in days given a date-of-birth string (YYYY-MM-DD).
 * Uses UTC dates to avoid timezone skew.
 */
export function computeAgeDays(dateOfBirth: string): number {
  const dob = new Date(dateOfBirth + "T00:00:00");
  const now = new Date();
  const utcNow = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const utcDob = Date.UTC(dob.getUTCFullYear(), dob.getUTCMonth(), dob.getUTCDate());
  return Math.floor((utcNow - utcDob) / (1000 * 60 * 60 * 24));
}

/**
 * Find the feeding range that matches the given age in days.
 * Returns the matching range and the next range (if any).
 */
export function findFeedingRange(
  ranges: FeedingRange[],
  ageDays: number,
): { current: FeedingRange; next: FeedingRange | null } | null {
  for (let i = 0; i < ranges.length; i++) {
    const range = ranges[i];
    const inRange =
      ageDays >= range.minDays &&
      (range.maxDays === null || ageDays < range.maxDays);
    if (inRange) {
      return {
        current: range,
        next: i + 1 < ranges.length ? ranges[i + 1] : null,
      };
    }
  }
  return null;
}

/** Format age in days to a human-friendly string. */
export function formatAge(days: number): string {
  if (days < 7) return `${days} day${days === 1 ? "" : "s"}`;
  if (days < 30) {
    const weeks = Math.floor(days / 7);
    const rem = days % 7;
    if (rem === 0) return `${weeks} week${weeks === 1 ? "" : "s"}`;
    return `${weeks}w ${rem}d`;
  }
  if (days < 365) {
    const months = Math.floor(days / 30);
    return `~${months} month${months === 1 ? "" : "s"}`;
  }
  const years = Math.floor(days / 365);
  const months = Math.floor((days % 365) / 30);
  if (months === 0) return `${years} year${years === 1 ? "" : "s"}`;
  return `${years}y ${months}m`;
}

export function formatMlRange(min: number, max: number): string {
  return `${min}–${max} ml`;
}

export function formatFeeds(min: number, max: number): string {
  return `${min}–${max} feeds/day`;
}
