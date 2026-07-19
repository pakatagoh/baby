import { ChevronDown } from "lucide-react";

export type EntryFilter = "active" | "completed" | "all";

const FILTER_OPTIONS = [
  ["active", "Active"],
  ["completed", "Completed"],
  ["all", "All"],
] as const;

interface StatusFilterChipsProps {
  filter: EntryFilter;
  onFilterChange: (filter: EntryFilter) => void;
  filtersOpen: boolean;
  onToggleFilters: () => void;
}

export function StatusFilterChips({
  filter,
  onFilterChange,
  filtersOpen,
  onToggleFilters,
}: StatusFilterChipsProps) {
  return (
    <div className="mb-3 flex gap-2">
      {FILTER_OPTIONS.map(([key, label]) => {
        const selected = filter === key;
        return (
          <button
            key={key}
            type="button"
            onClick={() => onFilterChange(key)}
            className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
              selected
                ? "bg-primary text-primary-foreground ring-2 ring-primary/30"
                : "border border-border bg-transparent text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            }`}
          >
            {label}
          </button>
        );
      })}
      <button
        type="button"
        onClick={onToggleFilters}
        className={`inline-flex items-center gap-1 rounded-md border px-3 text-xs transition-colors ${
          filtersOpen
            ? "border-primary bg-primary/10 text-primary"
            : "hover:bg-accent"
        }`}
      >
        Filters
        <ChevronDown
          className={`size-3 transition-transform ${filtersOpen ? "rotate-180" : ""}`}
        />
      </button>
    </div>
  );
}
