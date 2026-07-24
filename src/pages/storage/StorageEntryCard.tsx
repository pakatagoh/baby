import type { MilkSheetEntry } from "@/lib/sheets";
import { getExpiryDate } from "@/lib/expiry";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { MilkBottlePlaceholder } from "@/components/svg/MilkBottlePlaceholder";
import { ChevronRight } from "lucide-react";
import { formatFrozenDate } from "@/lib/frozen-date";

interface StorageEntryCardProps {
  entry: MilkSheetEntry;
  checked: boolean;
  onToggle: () => void;
  onOpenDetail: () => void;
}

function parseSheetDate(s: string): number {
  const m = s.match(/^(\d{1,2})-(\w{3})-(\d{2})$/);
  if (!m) return NaN;
  const d = new Date(`${m[2]} ${m[1]}, 20${m[3]}`);
  return d.getTime();
}

function daysFromNow(dateStr: string): number | null {
  const ms = parseSheetDate(dateStr);
  if (Number.isNaN(ms)) return null;
  return Math.ceil((ms - Date.now()) / (24 * 60 * 60 * 1000));
}

function expiryColor(days: number): string {
  if (days <= 7) return "text-red-500";
  if (days <= 30) return "text-orange-500";
  return "text-emerald-600";
}

export function StorageEntryCard({ entry, checked, onToggle, onOpenDetail }: StorageEntryCardProps) {
  const expiryDate = getExpiryDate(entry);
  const days = expiryDate ? daysFromNow(expiryDate) : null;
  const isUsed = entry.used;

  return (
    <div
      className="flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-accent/50"
      onClick={onOpenDetail}
    >
      {/* Thumbnail */}
      {entry.imageUrl ? (
        <img
          src={entry.imageUrl}
          srcSet={entry.srcSetThumb}
          sizes="48px"
          alt={`Milk packet ${formatFrozenDate(entry)}`}
          className="h-12 w-12 shrink-0 rounded-md bg-muted object-cover"
        />
      ) : (
        <div className="flex h-14 w-12 shrink-0 items-center justify-center rounded-md bg-muted">
          <MilkBottlePlaceholder />
        </div>
      )}

      {/* Info */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="text-base font-medium">{entry.amount}ml</p>
          <Badge
            variant="secondary"
            className={
              isUsed
                ? "bg-gray-200 text-gray-600 hover:bg-gray-200"
                : "bg-[#b8d4f0] text-[#1a2d42] hover:bg-[#b8d4f0]"
            }
          >
            {isUsed ? "Used" : "Frozen"}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground">Frozen {formatFrozenDate(entry)}</p>
        {!isUsed && expiryDate && days !== null && (
          <p className="text-xs">
            Expires {expiryDate}
            {" · "}
            <span className={`font-medium ${expiryColor(days)}`}>
              in {days} day{days !== 1 ? "s" : ""}
            </span>
          </p>
        )}
      </div>

      {/* Checkbox — only for non-used entries, with generous touch target */}
      {!isUsed && (
        <div
          className="flex shrink-0 items-center justify-center p-2 -m-2"
          onClick={(e) => e.stopPropagation()}
        >
          <Checkbox
            checked={checked}
            onCheckedChange={() => onToggle()}
            className="size-5"
          />
        </div>
      )}
      {/* Chevron hint for used entries (no checkbox) */}
      {isUsed && (
        <ChevronRight className="size-4 shrink-0 text-muted-foreground/40" />
      )}
    </div>
  );
}
