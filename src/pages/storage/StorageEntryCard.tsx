import type { MilkSheetEntry } from "@/lib/sheets";
import { getExpiryDate } from "@/lib/expiry";
import { Checkbox } from "@/components/ui/checkbox";
import { ChevronRight } from "lucide-react";

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
      className={`flex cursor-pointer items-center gap-3 rounded-lg border border-l-4 p-3 transition-colors ${
        checked ? "bg-accent" : "bg-card hover:bg-accent/50"
      } ${
        isUsed ? "border-l-gray-300" : "border-l-sky-500"
      }`}
      onClick={onOpenDetail}
    >
      {/* Thumbnail */}
      {entry.imageUrl ? (
        <img
          src={entry.imageUrl}
          srcSet={entry.srcSetThumb}
          sizes="48px"
          alt={`Milk packet ${entry.date}`}
          className="h-12 w-12 shrink-0 rounded-md bg-muted object-cover"
        />
      ) : (
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-muted">
          <svg width="24" height="32" viewBox="0 0 24 32" fill="none">
            <rect x="4" y="10" width="16" height="22" rx="3" fill="#d4c5b9" stroke="#b0a090" strokeWidth="1" />
            <rect x="8" y="12" width="8" height="16" rx="2" fill="#f0e8e0" />
            <line x1="8" y1="16" x2="16" y2="16" stroke="#b0a090" strokeWidth="0.5" />
            <line x1="8" y1="20" x2="16" y2="20" stroke="#b0a090" strokeWidth="0.5" />
            <line x1="8" y1="24" x2="13" y2="24" stroke="#b0a090" strokeWidth="0.5" />
            <rect x="9" y="6" width="6" height="5" rx="1" fill="#d4c5b9" stroke="#b0a090" strokeWidth="1" />
          </svg>
        </div>
      )}

      {/* Info */}
      <div className="min-w-0 flex-1">
        <p className="text-base font-medium">{entry.amount}ml</p>
        <p className="text-xs text-muted-foreground">Frozen {entry.date}</p>
        {expiryDate && days !== null && (
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
