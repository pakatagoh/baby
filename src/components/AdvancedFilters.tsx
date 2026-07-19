export type NumOp = "eq" | "gte" | "lte";

interface AdvancedFiltersProps {
  dateStart: string;
  dateEnd: string;
  onDateStartChange: (v: string) => void;
  onDateEndChange: (v: string) => void;
  amountOp: NumOp;
  amountVal: string;
  onAmountOpChange: (v: NumOp) => void;
  onAmountValChange: (v: string) => void;
  packetsOp: NumOp;
  packetsVal: string;
  onPacketsOpChange: (v: NumOp) => void;
  onPacketsValChange: (v: string) => void;
  onClear: () => void;
}

export function AdvancedFilters({
  dateStart,
  dateEnd,
  onDateStartChange,
  onDateEndChange,
  amountOp,
  amountVal,
  onAmountOpChange,
  onAmountValChange,
  packetsOp,
  packetsVal,
  onPacketsOpChange,
  onPacketsValChange,
  onClear,
}: AdvancedFiltersProps) {
  const hasAny =
    dateStart !== "" || dateEnd !== "" || amountVal !== "" || packetsVal !== "";

  return (
    <div className="mb-3 rounded-lg border bg-card p-3">
      {/* Date range — full width row */}
      <fieldset className="mb-3">
        <legend className="mb-1 text-xs font-medium text-muted-foreground">
          Date range
        </legend>
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={dateStart}
            onChange={(e) => onDateStartChange(e.target.value)}
            className="h-8 flex-1 rounded border bg-background px-2 text-xs"
          />
          <span className="text-xs text-muted-foreground">–</span>
          <input
            type="date"
            value={dateEnd}
            onChange={(e) => onDateEndChange(e.target.value)}
            className="h-8 flex-1 rounded border bg-background px-2 text-xs"
          />
        </div>
      </fieldset>

      {/* Numeric filters — two-column row */}
      <div className="grid grid-cols-2 gap-3">
        <fieldset>
          <legend className="mb-1 text-xs font-medium text-muted-foreground">
            Amount (ml)
          </legend>
          <div className="flex items-center gap-1">
            <select
              value={amountOp}
              onChange={(e) => onAmountOpChange(e.target.value as NumOp)}
              className="h-7 rounded border bg-background px-1 text-xs"
            >
              <option value="eq">=</option>
              <option value="gte">≥</option>
              <option value="lte">≤</option>
            </select>
            <input
              type="number"
              placeholder="off"
              value={amountVal}
              onChange={(e) => onAmountValChange(e.target.value)}
              className="h-7 w-full rounded border bg-background px-2 text-xs placeholder:text-muted-foreground/60"
            />
          </div>
        </fieldset>

        <fieldset>
          <legend className="mb-1 text-xs font-medium text-muted-foreground">
            Total packets
          </legend>
          <div className="flex items-center gap-1">
            <select
              value={packetsOp}
              onChange={(e) => onPacketsOpChange(e.target.value as NumOp)}
              className="h-7 rounded border bg-background px-1 text-xs"
            >
              <option value="eq">=</option>
              <option value="gte">≥</option>
              <option value="lte">≤</option>
            </select>
            <input
              type="number"
              placeholder="off"
              value={packetsVal}
              onChange={(e) => onPacketsValChange(e.target.value)}
              className="h-7 w-full rounded border bg-background px-2 text-xs placeholder:text-muted-foreground/60"
            />
          </div>
        </fieldset>
      </div>

      {/* Clear all */}
      {hasAny && (
        <button
          type="button"
          onClick={onClear}
          className="mt-2 text-xs text-muted-foreground underline hover:text-foreground"
        >
          Clear numeric filters
        </button>
      )}
    </div>
  );
}
