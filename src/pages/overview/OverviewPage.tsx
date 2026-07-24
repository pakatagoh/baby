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

function parseSheetDate(s: string): number {
  const m = s.match(/^(\\d{1,2})-(\\w{3})-(\\d{2})$/);
  if (!m) return NaN;
  const d = new Date(`${m[2]} ${m[1]}, 20${m[3]}`);
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

    console.log("[timelineBuckets] activeEntries:", activeEntries.length, "buckets:", buckets.map(b => `${b.label}=${b.bags}`).join(", "));

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
      {entries.length > 0 ? (
        <ExpiryTimeline buckets={timelineBuckets} />
      ) : (
        <div className="rounded-lg border bg-card p-4 animate-pulse">
          <div className="h-4 w-32 rounded bg-muted mb-3" />
          <div className="space-y-2">
            {[1,2,3,4].map((i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="h-3 w-20 rounded bg-muted" />
                <div className="flex-1 h-2 rounded bg-muted" />
              </div>
            ))}
          </div>
        </div>
      )}
      <RecentActivity activities={activities} entries={entries} />
    </main>
  );
}
