import { useMemo } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { getActivities } from "@/lib/activity-log-fn";
import { getEntries } from "@/lib/entries-fn";
import type { MilkSheetEntry } from "@/lib/sheets";
import { MilkBottlePlaceholder } from "@/components/svg/MilkBottlePlaceholder";
import { formatFrozenDate } from "@/lib/frozen-date";

function formatActivityTime(iso: string): string {
  const occurredAt = new Date(iso);
  if (Number.isNaN(occurredAt.getTime())) return "";

  const elapsedMinutes = Math.floor((Date.now() - occurredAt.getTime()) / 60_000);
  if (elapsedMinutes < 1) return "just now";
  if (elapsedMinutes < 60) return `${elapsedMinutes}m ago`;

  const timeZone = "Asia/Singapore";
  const time = new Intl.DateTimeFormat("en-SG", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(occurredAt);
  const dateKeyFormatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const isToday = dateKeyFormatter.format(occurredAt) === dateKeyFormatter.format(new Date());

  if (isToday) return `Today at ${time}`;

  const date = new Intl.DateTimeFormat("en-SG", {
    timeZone,
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(occurredAt);
  return `${date} at ${time}`;
}

function formatActivity(eventType: string, entry?: MilkSheetEntry): string {
  if (entry) {
    if (eventType === "milk_frozen") return `Froze ${entry.amount} ml on ${formatFrozenDate(entry)}`;
    if (eventType === "entry_used") return `Used ${entry.amount} ml`;
    if (eventType === "entry_unused") return `Unused ${entry.amount} ml`;
  }
  return eventType;
}

export function ActivityPage() {
  const { data: activities = [] } = useQuery({
    queryKey: ["activities"],
    queryFn: () => getActivities(),
  });

  const { data: entries = [] } = useQuery({
    queryKey: ["entries"],
    queryFn: () => getEntries(),
  });

  const entryMap = useMemo(() => {
    const m = new Map<string, MilkSheetEntry>();
    for (const e of entries) m.set(e.id, e);
    return m;
  }, [entries]);

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-6">
      <h1 className="sr-only">Activity</h1>

      <h2 className="mb-4 text-xl font-bold">Activity</h2>

      {activities.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          No activity yet. Upload a milk packet to get started.
        </p>
      ) : (
        <div className="space-y-2">
          {activities.map((act) => {
            const entry = act.frozenMilkEntryId
              ? entryMap.get(act.frozenMilkEntryId)
              : undefined;
            const linkTo = act.frozenMilkEntryId
              ? ({ to: "/storage/$id" as const, params: { id: act.frozenMilkEntryId } })
              : null;

            const content = (
              <div className="flex items-center gap-3 rounded-lg border bg-card p-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted">
                  {entry?.imageUrl ? (
                    <img
                      src={entry.imageUrl}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <MilkBottlePlaceholder size="sm" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm">
                    {formatActivity(act.eventType, entry)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatActivityTime(act.createdAt)}
                  </p>
                </div>
              </div>
            );

            return linkTo ? (
              <Link key={act.id} {...linkTo} className="block transition-colors hover:bg-accent/50 rounded-lg">
                {content}
              </Link>
            ) : (
              <div key={act.id}>{content}</div>
            );
          })}
        </div>
      )}
    </main>
  );
}
