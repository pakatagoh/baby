import { useMemo } from "react";
import { Link } from "@tanstack/react-router";
import type { AppActivity } from "@/lib/activity-log-fn";
import type { MilkSheetEntry } from "@/lib/sheets";
import { MilkBottlePlaceholder } from "@/components/svg/MilkBottlePlaceholder";
import { formatFrozenDate } from "@/lib/frozen-date";

interface RecentActivityProps {
  activities: AppActivity[];
  entries: MilkSheetEntry[];
}

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
    if (eventType === "milk_frozen") return `Froze ${entry.amount} ml on ${formatFrozenDate(entry)}`;
    if (eventType === "entry_used") return `Used ${entry.amount} ml`;
    if (eventType === "entry_unused") return `Unused ${entry.amount} ml`;
  }
  return eventType;
}

export function RecentActivity({ activities, entries }: RecentActivityProps) {
  const entryMap = useMemo(
    () => new Map(entries.map((e) => [e.id, e])),
    [entries],
  );

  const latest3 = activities.slice(0, 3);

  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold">Recent Activity</h2>
        <Link
          to="/activity"
          className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          View all
        </Link>
      </div>
      {latest3.length === 0 ? (
        <p className="py-4 text-center text-xs text-muted-foreground">
          No activity yet. Upload a milk packet to get started.
        </p>
      ) : (
        <div className="space-y-2">
          {latest3.map((act) => {
            const entry = act.frozenMilkEntryId
              ? entryMap.get(act.frozenMilkEntryId)
              : undefined;
            const linkTo = act.frozenMilkEntryId
              ? ({ to: "/storage/$id" as const, params: { id: act.frozenMilkEntryId } })
              : null;

            const content = (
              <div className="flex items-center gap-3 rounded-lg border bg-card p-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted">
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
                  <p className="truncate text-sm">
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
    </section>
  );
}
