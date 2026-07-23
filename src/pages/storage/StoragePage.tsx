import { useState, useMemo, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getEntries } from "@/lib/entries-fn";
import { updateEntry } from "@/lib/update-entry-fn";
import type { MilkSheetEntry } from "@/lib/sheets";
import { TotalFrozenCard } from "@/pages/overview/TotalFrozenCard";
import { SlidersHorizontal } from "lucide-react";
import { SortDropdown, type SortKey } from "@/pages/storage/SortDropdown";
import { StorageTabs } from "@/pages/storage/StorageTabs";
import { StorageEntryCard } from "@/pages/storage/StorageEntryCard";
import { BatchActionBar } from "@/pages/storage/BatchActionBar";
import { FilterModal, type FilterState, type NumOp } from "@/pages/storage/FilterModal";
import { EntryDetailModal } from "@/pages/storage/EntryDetailModal";

type TabId = "all" | "frozen" | "used";

function parseSheetDate(s: string): number {
  const m = s.match(/^(\d{1,2})-(\w{3})-(\d{2})$/);
  if (!m) return NaN;
  const d = new Date(`${m[2]} ${m[1]}, 20${m[3]}`);
  return d.getTime();
}

function entryTimestamp(e: MilkSheetEntry): number {
  const dateMs = parseSheetDate(e.date);
  if (Number.isNaN(dateMs)) return 0;
  const [h = "0", m = "0"] = (e.time || "").split(":");
  return dateMs + Number(h) * 3_600_000 + Number(m) * 60_000;
}

function matchesNumFilter(value: number, op: NumOp, raw: string): boolean {
  if (raw === "") return true;
  const target = Number(raw);
  if (Number.isNaN(target)) return true;
  if (op === "eq") return value === target;
  if (op === "gte") return value >= target;
  return value <= target;
}

const defaultFilter: FilterState = {
  dateStart: "",
  dateEnd: "",
  amountOp: "eq",
  amountVal: "",
};

export function StoragePage() {
  const queryClient = useQueryClient();
  const updateFn = useServerFn(updateEntry);

  const { data: entries = [], error: loadError } = useQuery({
    queryKey: ["entries"],
    queryFn: () => getEntries(),
  });

  const [activeTab, setActiveTab] = useState<TabId>("frozen");
  const [sortKey, setSortKey] = useState<SortKey>("newest");
  const [filter, setFilter] = useState<FilterState>(defaultFilter);
  const [filterOpen, setFilterOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectedEntry, setSelectedEntry] = useState<MilkSheetEntry | null>(null);
  const [busy, setBusy] = useState(false);

  // ── Derived counts ────────────────────────────────────────────
  const frozenCount = useMemo(
    () => entries.filter((e) => !e.used).length,
    [entries],
  );
  const usedCount = useMemo(
    () => entries.filter((e) => e.used).length,
    [entries],
  );
  const totalMl = useMemo(
    () => entries.filter((e) => !e.used).reduce((sum, e) => sum + e.amount, 0),
    [entries],
  );

  // ── Tab filter ────────────────────────────────────────────────
  const tabbedEntries = useMemo(() => {
    if (activeTab === "frozen") return entries.filter((e) => !e.used);
    if (activeTab === "used") return entries.filter((e) => e.used);
    return entries;
  }, [entries, activeTab]);

  // ── Custom filter (date + amount) ─────────────────────────────
  const filteredEntries = useMemo(() => {
    return tabbedEntries.filter((e) => {
      if (filter.dateStart) {
        const ts = parseSheetDate(e.date);
        const start = Date.parse(filter.dateStart + "T00:00:00");
        if (!Number.isNaN(ts) && ts < start) return false;
      }
      if (filter.dateEnd) {
        const ts = parseSheetDate(e.date);
        const end = Date.parse(filter.dateEnd + "T00:00:00") + 86_399_999;
        if (!Number.isNaN(ts) && ts > end) return false;
      }
      if (!matchesNumFilter(e.amount, filter.amountOp, filter.amountVal)) return false;
      return true;
    });
  }, [tabbedEntries, filter]);

  // ── Sort ──────────────────────────────────────────────────────
  const sortedEntries = useMemo(() => {
    const sorted = [...filteredEntries].sort((a, b) => {
      switch (sortKey) {
        case "newest":
          return entryTimestamp(b) - entryTimestamp(a);
        case "oldest":
          return entryTimestamp(a) - entryTimestamp(b);
        case "largest":
          return b.amount - a.amount;
        case "least":
          return a.amount - b.amount;
      }
    });
    return sorted;
  }, [filteredEntries, sortKey]);

  // ── Selection ─────────────────────────────────────────────────
  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleMarkUsed = async () => {
    if (selectedIds.size === 0) return;
    setBusy(true);
    try {
      const targets = entries.filter((e) => selectedIds.has(e.id) && e.rowIndex);
      await Promise.all(
        targets.map((e) =>
          updateFn({ data: { rowIndex: e.rowIndex!, used: true, totalUsed: e.packets, usedAt: new Date().toISOString() } }),
        ),
      );
      void queryClient.invalidateQueries({ queryKey: ["entries"] });
      setSelectedIds(new Set());
    } finally {
      setBusy(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────
  return (
    <main className="mx-auto w-full max-w-4xl space-y-4 px-4 py-6">
      <h1 className="text-2xl font-bold">📦 Storage</h1>

      <TotalFrozenCard totalMl={totalMl} />

      {/* Tabs */}
      <StorageTabs
        activeTab={activeTab}
        onTabChange={(tab) => {
          setActiveTab(tab);
          setSelectedIds(new Set());
        }}
        totalCount={entries.length}
        frozenCount={frozenCount}
        usedCount={usedCount}
      />

      {/* Sort + Filter row */}
      <div className="flex items-center justify-between gap-2">
        <SortDropdown sortKey={sortKey} onSortChange={setSortKey} />
        <button
          type="button"
          onClick={() => setFilterOpen(true)}
          className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-sm transition-colors ${
            filter.dateStart || filter.dateEnd || filter.amountVal
              ? "bg-primary/10 text-primary"
              : "hover:text-foreground"
          }`}
        >
          <SlidersHorizontal className="size-4" />
          Filters
        </button>
      </div>

      {/* Entry list */}
      <div className="flex flex-col gap-2">
        {loadError ? (
          <p className="py-8 text-center text-sm text-red-600">Couldn't load entries.</p>
        ) : sortedEntries.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">No entries found.</p>
        ) : (
          sortedEntries.map((entry) => (
            <StorageEntryCard
              key={entry.id}
              entry={entry}
              checked={selectedIds.has(entry.id)}
              onToggle={() => toggleSelect(entry.id)}
              onOpenDetail={() => setSelectedEntry(entry)}
            />
          ))
        )}
      </div>

      {/* Batch action bar */}
      <BatchActionBar selectedCount={selectedIds.size} onMarkUsed={handleMarkUsed} busy={busy} />

      {/* Filter modal */}
      <FilterModal
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        filter={filter}
        onApply={setFilter}
      />

      {/* Entry detail modal */}
      <EntryDetailModal
        entry={selectedEntry}
        open={selectedEntry !== null}
        onClose={() => setSelectedEntry(null)}
      />
    </main>
  );
}
