import { createServerFn } from "@tanstack/react-start";
import { fetchBabyProfile } from "./baby-profile";
import {
  feedingRanges,
  computeAgeDays,
  findFeedingRange,
  formatAge,
  type FeedingRange,
} from "./feeding-guide-data";

export interface FeedingGuideData {
  ageDays: number | null;
  ageLabel: string | null;
  firstName: string | null;
  current: FeedingRange | null;
  next: FeedingRange | null;
}

/** Compute age-specific feeding recommendations from the baby's DOB. */
export const getFeedingGuide = createServerFn({ method: "GET" }).handler(
  async (): Promise<FeedingGuideData> => {
    const profile = await fetchBabyProfile();

    if (!profile?.dateOfBirth) {
      return {
        ageDays: null,
        ageLabel: null,
        firstName: profile?.firstName ?? null,
        current: null,
        next: null,
      };
    }

    const ageDays = computeAgeDays(profile.dateOfBirth);
    const match = findFeedingRange(feedingRanges, ageDays);

    return {
      ageDays,
      ageLabel: formatAge(ageDays),
      firstName: profile.firstName,
      current: match?.current ?? null,
      next: match?.next ?? null,
    };
  },
);
