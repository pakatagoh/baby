import type { FeedingRange } from "@/lib/feeding-guide-data";
import { formatMlRange, formatFeeds } from "@/lib/feeding-guide-data";

interface Props {
  current: FeedingRange;
  next: FeedingRange | null;
}

export function FeedingOverview({ current, next }: Props) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {/* Current range */}
      <div className="rounded-xl border-2 border-primary bg-primary/5 p-5">
        <span className="inline-block rounded-full bg-primary px-2.5 py-0.5 text-xs font-semibold text-primary-foreground">
          Current
        </span>
        <h2 className="mt-2 text-lg font-bold">{current.label}</h2>
        <dl className="mt-3 space-y-1.5 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Per feed</dt>
            <dd className="font-semibold">
              {formatMlRange(current.perFeedMin, current.perFeedMax)}
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Feeds / day</dt>
            <dd className="font-semibold">
              {formatFeeds(current.feedsMin, current.feedsMax)}
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Daily total</dt>
            <dd className="font-semibold">~{current.dailyTotal} ml</dd>
          </div>
          {current.solids && (
            <div className="mt-2 rounded-lg bg-white/60 p-2 text-xs text-muted-foreground">
              🥄 <strong>Solids:</strong> {current.solids}
            </div>
          )}
        </dl>
      </div>

      {/* Coming next */}
      {next && (
        <div className="rounded-xl border-2 border-dashed border-muted-foreground/25 bg-card p-5">
          <span className="inline-block rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
            Coming next
          </span>
          <h2 className="mt-2 text-lg font-semibold text-muted-foreground">
            {next.label}
          </h2>
          <dl className="mt-3 space-y-1.5 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Per feed</dt>
              <dd className="font-medium">
                {formatMlRange(next.perFeedMin, next.perFeedMax)}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Feeds / day</dt>
              <dd className="font-medium">
                {formatFeeds(next.feedsMin, next.feedsMax)}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Daily total</dt>
              <dd className="font-medium">~{next.dailyTotal} ml</dd>
            </div>
            {next.solids && (
              <div className="mt-2 rounded-lg bg-muted/50 p-2 text-xs text-muted-foreground">
                🥄 <strong>Solids:</strong> {next.solids}
              </div>
            )}
          </dl>
        </div>
      )}
    </div>
  );
}
