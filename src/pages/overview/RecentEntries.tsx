import type { MilkSheetEntry } from "@/lib/sheets";
import { getExpiryDate, formatExpiryShort } from "@/lib/expiry";

interface RecentEntriesProps {
  entries: MilkSheetEntry[];
}

export function RecentEntries({ entries }: RecentEntriesProps) {
  if (entries.length === 0) return null;

  return (
    <div>
      <h2 className="mb-3 text-sm font-semibold text-muted-foreground">
        Recent Entries
      </h2>
      <div className="space-y-2">
        {entries.slice(0, 3).map((entry) => (
          <div
            key={entry.id}
            className="flex items-center gap-3 rounded-lg border bg-card p-3"
          >
            {entry.imageUrl ? (
              <img
                src={entry.imageUrl}
                srcSet={entry.srcSetThumb}
                sizes="48px"
                alt={`Milk packet ${entry.date}`}
                className="h-12 w-12 shrink-0 rounded-md bg-muted object-cover"
              />
            ) : (
              <div className="h-12 w-12 shrink-0 rounded-md bg-muted" />
            )}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">
                {entry.amount}ml · {entry.date}
              </p>
              <p className="text-xs text-muted-foreground">
                {(() => {
                  const d = getExpiryDate(entry);
                  return d ? `Expires ${formatExpiryShort(d)}` : "—";
                })()}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
