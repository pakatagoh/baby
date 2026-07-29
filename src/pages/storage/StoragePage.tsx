import { useState, useMemo, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getEntries } from "@/lib/entries-fn";
import { updateEntry } from "@/lib/update-entry-fn";
import type { MilkSheetEntry } from "@/lib/sheets";
import { TotalFrozenCard } from "@/pages/overview/TotalFrozenCard";
import { SlidersHorizontal } from "lucide-react";
import { getFrozenMs } from "@/lib/frozen-date";
import { SortDropdown, type SortKey } from "@/pages/storage/SortDropdown";
import { StorageTabs } from "@/pages/storage/StorageTabs";
import { StorageEntryCard } from "@/pages/storage/StorageEntryCard";
import { BatchActionBar } from "@/pages/storage/BatchActionBar";
import { FilterModal, type FilterState } from "@/pages/storage/FilterModal";
import { EntryDetailModal } from "@/pages/storage/EntryDetailModal";
import { filterStorageEntries, getStorageTabCounts } from "@/pages/storage/storage-filtering";
import { fetchSortOption, sortOptionToSortKey } from "@/lib/app-settings-fn";

type TabId = "all" | "frozen" | "used";

function entryTimestamp(e: MilkSheetEntry): number {
  return getFrozenMs(e);
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

  const { data: sortOption } = useQuery({
    queryKey: ["appSetting", "sort"],
    queryFn: () => fetchSortOption(),
  });
  const [activeTab, setActiveTab] = useState<TabId>("frozen");
  const [sortKey, setSortKey] = useState<SortKey>(
    sortOption ? sortOptionToSortKey(sortOption) : "newest",
  );
  const [filter, setFilter] = useState<FilterState>(defaultFilter);
  const [filterOpen, setFilterOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectedEntry, setSelectedEntry] = useState<MilkSheetEntry | null>(null);
  const [busy, setBusy] = useState(false);

  // ── Custom filter (date + amount) ─────────────────────────────
  const filterMatchedEntries = useMemo(
    () => filterStorageEntries(entries, filter),
    [entries, filter],
  );
  const tabCounts = useMemo(
    () => getStorageTabCounts(filterMatchedEntries),
    [filterMatchedEntries],
  );
  const totalMl = useMemo(
    () => entries.filter((entry) => !entry.used).reduce((sum, entry) => sum + entry.amount, 0),
    [entries],
  );

  // ── Tab filter ────────────────────────────────────────────────
  const tabbedEntries = useMemo(() => {
    if (activeTab === "frozen") return filterMatchedEntries.filter((e) => !e.used);
    if (activeTab === "used") return filterMatchedEntries.filter((e) => e.used);
    return filterMatchedEntries;
  }, [filterMatchedEntries, activeTab]);

  // ── Sort ──────────────────────────────────────────────────────
  const sortedEntries = useMemo(() => {
    const sorted = [...tabbedEntries].sort((a, b) => {
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
  }, [tabbedEntries, sortKey]);

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
          updateFn({ data: { rowIndex: e.rowIndex!, used: true, totalUsed: e.packets, usedAt: new Date().toISOString(), entryId: e.id } }),
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
      <TotalFrozenCard totalMl={totalMl} />

      {/* Tabs */}
      <StorageTabs
        activeTab={activeTab}
        onTabChange={(tab) => {
          setActiveTab(tab);
          setSelectedIds(new Set());
        }}
        totalCount={tabCounts.all}
        frozenCount={tabCounts.frozen}
        usedCount={tabCounts.used}
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
      <h1 className="sr-only">Storage</h1>
    </main>
  );
}
