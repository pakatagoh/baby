import type { MilkSheetEntry } from "@/lib/sheets";

interface EntryCardProps {
  entry: MilkSheetEntry;
}

export function EntryCard({ entry }: EntryCardProps) {
  return (
    <div className="flex items-center gap-3 rounded-lg border bg-card p-3">
      {entry.imageUrl ? (
        <img
          src={entry.imageUrl}
          alt="Milk packet"
          className="h-16 w-16 rounded-md bg-muted object-cover"
          onError={(e) => {
            e.currentTarget.style.visibility = "hidden";
          }}
        />
      ) : (
        <div className="h-16 w-16 rounded-md bg-muted" />
      )}
      <div className="flex-1">
        <p className="text-sm font-medium">
          {entry.date} {entry.time}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          {entry.amount}ml · {entry.packets} pkt
          {" · "}
          <span title="Frozen">❄️ {entry.totalFrozen}</span>
          {" · "}
          <span title="Used">🍼 {entry.totalUsed}</span>
        </p>
        {entry.notes && (
          <p className="mt-1 text-xs italic text-muted-foreground">
            &ldquo;{entry.notes}&rdquo;
          </p>
        )}
      </div>
    </div>
  );
}
