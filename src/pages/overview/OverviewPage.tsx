import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { getEntries } from "@/lib/entries-fn";
import { getBabyProfile } from "@/lib/baby-profile-fn";
import { getActivities } from "@/lib/activity-log-fn";
import { getExpiryDate, formatExpiryShort } from "@/lib/expiry";
import type { MilkSheetEntry } from "@/lib/sheets";
import { BabyProfileHero } from "@/pages/overview/BabyProfileHero";
import { StatsGrid } from "@/pages/overview/StatsGrid";
import { ExpiryTimeline } from "@/pages/overview/ExpiryTimeline";
import { RecentActivity } from "@/pages/overview/RecentActivity";

const MONTHS: Record<string, number> = {
  Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
  Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11,
};

function parseSheetDate(s: string): number {
  const m = s.match(/^(\d{1,2})-(\w{3})-(\d{2})$/);
  if (!m) return NaN;
  const month = MONTHS[m[2]];
  if (month === undefined) return NaN;
  const d = new Date(2000 + Number(m[3]), month, Number(m[1]));
  return d.getTime();
}

function daysUntilExpiry(entry: MilkSheetEntry): number {
  const freezeMs = parseSheetDate(entry.date);
  if (Number.isNaN(freezeMs)) return Infinity;
  const expiryMs = freezeMs + 3 * 30 * 24 * 60 * 60 * 1000; // approx 3 months
  const now = Date.now();
  return Math.ceil((expiryMs - now) / (24 * 60 * 60 * 1000));
}

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

  // Upcoming expiry: the earliest freezeDate + 3mo among active entries
  const upcomingExpiry = useMemo(() => {
    let earliest: string | null = null;
    for (const e of activeEntries) {
      const d = getExpiryDate(e);
      if (d && (!earliest || d < earliest)) earliest = d;
    }
    return earliest ? formatExpiryShort(earliest) : null;
  }, [activeEntries]);

  // Expiring soon: active entries where days left ≤ 7
  const expiringSoon = useMemo(
    () => activeEntries.filter((e) => daysUntilExpiry(e) <= 7).length,
    [activeEntries],
  );

  // Timeline buckets — computed from active entries by expiry urgency
  const timelineBuckets = useMemo(() => {
    interface Bucket { label: string; color: string; bags: number; ml: number; }
    const buckets: Bucket[] = [
      { label: "Within 1 week", color: "red",    bags: 0, ml: 0 },
      { label: "1–2 weeks",     color: "orange", bags: 0, ml: 0 },
      { label: "2–4 weeks",     color: "yellow", bags: 0, ml: 0 },
      { label: "1–3 months",    color: "green",  bags: 0, ml: 0 },
    ];

    for (const e of activeEntries) {
      const days = daysUntilExpiry(e);
      if (days <= 7)            { buckets[0].bags++; buckets[0].ml += e.amount; }
      else if (days <= 14)      { buckets[1].bags++; buckets[1].ml += e.amount; }
      else if (days <= 28)      { buckets[2].bags++; buckets[2].ml += e.amount; }
      else if (days <= 90)      { buckets[3].bags++; buckets[3].ml += e.amount; }
    }

    if (activeEntries.length > 0) {
      const sample = activeEntries[0];
      console.log("[fix] activeEntries:", activeEntries.length, "sample date:", sample.date, "parsed:", parseSheetDate(sample.date), "days:", daysUntilExpiry(sample));
      console.log("[fix] buckets:", buckets.map(b => `${b.label}=${b.bags}`).join(", "));
    }

    const maxBags = Math.max(...buckets.map((b) => b.bags), 1);
    return buckets.map((b) => ({ ...b, maxBags }));
  }, [activeEntries]);

  return (
    <main className="mx-auto w-full max-w-4xl space-y-4 px-4 py-6">
      <h1 className="sr-only">Overview</h1>
      {profile && <BabyProfileHero profile={profile} imageUrl={profile.imageUrl} />}
      <StatsGrid
        bagCount={bagCount}
        upcomingExpiry={upcomingExpiry}
        expiringSoon={expiringSoon}
      />
      <ExpiryTimeline buckets={timelineBuckets} />
      <RecentActivity activities={activities} entries={entries} />
    </main>
  );
}
