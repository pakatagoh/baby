import { useMemo } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { getActivities } from "@/lib/activity-log-fn";
import { getEntries } from "@/lib/entries-fn";
import type { MilkSheetEntry } from "@/lib/sheets";
import { MilkBottlePlaceholder } from "@/components/svg/MilkBottlePlaceholder";

function timeAgo(iso: string): string {
  const now = Date.now();
  const then = Date.parse(iso);
  if (Number.isNaN(then)) return "";
  const seconds = Math.floor((now - then) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function formatActivity(eventType: string, entry?: MilkSheetEntry): string {
  if (entry) {
    if (eventType === "milk_frozen") return `Froze ${entry.amount} ml on ${entry.date}`;
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
                    {timeAgo(act.createdAt)}
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
