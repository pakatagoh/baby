import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { getEntries } from "@/lib/entries-fn";
import { getExpiryDate, formatExpiryShort } from "@/lib/expiry";
import type { MilkSheetEntry } from "@/lib/sheets";
import { StatsGrid } from "@/pages/overview/StatsGrid";
import { ExpiryTimeline } from "@/pages/overview/ExpiryTimeline";
import { RecentEntries } from "@/pages/overview/RecentEntries";

function parseSheetDate(s: string): number {
  const m = s.match(/^(\d{1,2})-(\w{3})-(\d{2})$/);
  if (!m) return NaN;
  const d = new Date(`${m[2]} ${m[1]}, 20${m[3]}`);
  return d.getTime();
}

/** Sortable timestamp: date + time, falling back to createdAt if time missing. */
function entryTimestamp(e: MilkSheetEntry): number {
  const dateMs = parseSheetDate(e.date);
  if (Number.isNaN(dateMs)) {
    // Fall back to createdAt ISO datetime
    const created = Date.parse(e.createdAt);
    return Number.isNaN(created) ? 0 : created;
  }
  const [h = "0", m = "0"] = (e.time || "").split(":");
  return dateMs + Number(h) * 3_600_000 + Number(m) * 60_000;
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

  // Timeline buckets — hardcoded for preview (remove after review)
  const timelineBuckets = useMemo(() => {
    const maxBags = 10;
    return [
      { label: "Within 1 week", color: "red",  bags: 2, ml: 180, maxBags },
      { label: "1–2 weeks",     color: "orange", bags: 3, ml: 300, maxBags },
      { label: "2–4 weeks",     color: "yellow", bags: 4, ml: 420, maxBags },
      { label: "1–3 months",    color: "green", bags: 5, ml: 500, maxBags },
    ];
  }, []);

  // Recent entries: last 3 by date+time descending (createdAt fallback)
  const recentEntries = useMemo(() => {
    return [...entries]
      .sort((a, b) => entryTimestamp(b) - entryTimestamp(a))
      .slice(0, 3);
  }, [entries]);

  return (
    <main className="mx-auto w-full max-w-4xl space-y-4 px-4 py-6">
      <StatsGrid
        bagCount={bagCount}
        upcomingExpiry={upcomingExpiry}
        expiringSoon={expiringSoon}
      />
      <ExpiryTimeline buckets={timelineBuckets} />
      <RecentEntries entries={recentEntries} />
    </main>
  );
}
