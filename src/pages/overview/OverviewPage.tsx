import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { getEntries } from "@/lib/entries-fn";
import { getBabyProfile } from "@/lib/baby-profile-fn";
import { getActivities } from "@/lib/activity-log-fn";
import { getExpiryDate, getExpiryMs, daysUntilExpiry, formatExpiryShort } from "@/lib/expiry";
import type { MilkSheetEntry } from "@/lib/sheets";
import { BabyProfileHero } from "@/pages/overview/BabyProfileHero";
import { StatsGrid } from "@/pages/overview/StatsGrid";
import { ExpiryTimeline } from "@/pages/overview/ExpiryTimeline";
import { RecentActivity } from "@/pages/overview/RecentActivity";

export function OverviewPage() {
  const { data: entries = [] } = useQuery({
    queryKey: ["entries"],
    queryFn: () => getEntries(),
  });

  const { data: profile } = useQuery({
    queryKey: ["babyProfile"],
    queryFn: () => getBabyProfile(),
    staleTime: 5 * 60 * 1000,
  });

  const { data: activities = [] } = useQuery({
    queryKey: ["activities"],
    queryFn: () => getActivities(),
  });

  const activeEntries = useMemo(
    () => entries.filter((e) => !e.used),
    [entries],
  );

  const bagCount = activeEntries.length;

  const upcomingExpiry = useMemo(() => {
    let earliest: string | null = null;
    let earliestMs = Infinity;
    for (const e of activeEntries) {
      const expiryMs = getExpiryMs(e);
      if (expiryMs < earliestMs) {
        earliestMs = expiryMs;
        earliest = getExpiryDate(e);
      }
    }
    return earliest ? formatExpiryShort(earliest) : null;
  }, [activeEntries]);

  const expiringSoon = useMemo(
    () => activeEntries.filter((e) => daysUntilExpiry(e) <= 7).length,
    [activeEntries],
  );

  const hasEntries = entries.length > 0;
  const timelineBuckets = hasEntries ? computeTimelineBuckets(activeEntries) : null;

  return (
    <main className="mx-auto w-full max-w-4xl space-y-4 px-4 py-6">
      {profile && <BabyProfileHero profile={profile} imageUrl={profile.imageUrl} />}
      <StatsGrid
        bagCount={bagCount}
        upcomingExpiry={upcomingExpiry}
        expiringSoon={expiringSoon}
      />
      {hasEntries && timelineBuckets ? (
        <ExpiryTimeline buckets={timelineBuckets} />
      ) : (
        <div className="rounded-lg border bg-card p-4 animate-pulse">
          <div className="h-4 w-32 rounded bg-muted mb-3" />
          <div className="space-y-2">
            {[1,2,3,4,5].map((i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="h-3 w-20 rounded bg-muted" />
                <div className="flex-1 h-2 rounded bg-muted" />
              </div>
            ))}
          </div>
        </div>
      )}
      <RecentActivity activities={activities} entries={entries} />
      <h1 className="sr-only">Overview</h1>
    </main>
  );
}

function computeTimelineBuckets(entries: MilkSheetEntry[]) {
  interface Bucket { label: string; color: string; bags: number; ml: number; }
  const buckets: Bucket[] = [
    { label: "Within 1 week", color: "red",    bags: 0, ml: 0 },
    { label: "1–2 weeks",     color: "orange", bags: 0, ml: 0 },
    { label: "2–4 weeks",     color: "yellow", bags: 0, ml: 0 },
    { label: "1–3 months",    color: "green",  bags: 0, ml: 0 },
    { label: "3–6 months",    color: "green",  bags: 0, ml: 0 },
  ];

  const now = Date.now();
  const today = { frozenAt: new Date(now).toISOString() };
  const threeMonthsFromNow = getExpiryMs(today, 3);
  const sixMonthsFromNow = getExpiryMs(today, 6);
  for (const e of entries) {
    const days = daysUntilExpiry(e, now);
    const expiryMs = getExpiryMs(e);
    if (days <= 7)            { buckets[0].bags++; buckets[0].ml += e.amount; }
    else if (days <= 14)      { buckets[1].bags++; buckets[1].ml += e.amount; }
    else if (days <= 28)      { buckets[2].bags++; buckets[2].ml += e.amount; }
    else if (expiryMs <= threeMonthsFromNow) { buckets[3].bags++; buckets[3].ml += e.amount; }
    else if (expiryMs <= sixMonthsFromNow) { buckets[4].bags++; buckets[4].ml += e.amount; }
  }

  const maxBags = Math.max(...buckets.map((b) => b.bags), 1);
  return buckets.map((b) => ({ ...b, maxBags }));
}
