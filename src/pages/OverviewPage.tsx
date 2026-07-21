import { useRef, useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { uploadMilk } from "@/lib/upload-fn";
import { getEntries } from "@/lib/entries-fn";
import type { MilkSheetEntry } from "@/lib/sheets";
import { ArrowUpDown } from "lucide-react";
import { SnapMilkPacketButton } from "@/components/SnapMilkPacketButton";
import { PendingUploadList, type PendingEntry } from "@/components/PendingUploadList";
import { EntryCard } from "@/components/EntryCard";
import {
  StatusFilterChips,
  type EntryFilter,
} from "@/components/StatusFilterChips";
import {
  AdvancedFilters,
  type NumOp,
} from "@/components/AdvancedFilters";
import { StorageSummary } from "@/components/StorageSummary";

export function OverviewPage() {
  const queryClient = useQueryClient();
  const { data: savedEntries = [], error: loadError } = useQuery({
    queryKey: ["entries"],
    queryFn: () => getEntries(),
  });

  const [pending, setPending] = useState<PendingEntry[]>([]);
  // Keeps the original File for each entry so a failed upload can be resubmitted.
  const filesRef = useRef<Map<string, File>>(new Map());
  const uploadMilkFn = useServerFn(uploadMilk);

  function handleFile(file: File) {
    console.log("[client] file selected:", {
      name: file.name,
      type: file.type,
      size: `${(file.size / 1024).toFixed(1)} KB`,
    });
    const id = crypto.randomUUID();
    filesRef.current.set(id, file);
    const previewUrl = URL.createObjectURL(file);

    // Optimistic entry appears immediately. The upload runs in the background,
    // so the user can keep snapping more photos without waiting for this one.
    setPending((prev) => [{ id, previewUrl, status: "processing" }, ...prev]);
    void runUpload(id, file);
  }

  function retry(id: string) {
    const file = filesRef.current.get(id);
    if (!file) return;
    setPending((prev) =>
      prev.map((e) =>
        e.id === id ? { ...e, status: "processing", error: undefined } : e,
      ),
    );
    void runUpload(id, file);
  }

  function dismiss(id: string) {
    setPending((prev) => prev.filter((e) => e.id !== id));
    filesRef.current.delete(id);
  }

  async function runUpload(id: string, file: File) {
    const form = new FormData();
    form.append("image", file);
    console.log("[client] starting upload, id:", id);
    try {
      const { id: serverId, result, srcSetThumb } = await uploadMilkFn({ data: form });
      console.log("[client] upload done, id:", id, "→ serverId:", serverId, "result:", result);
      setPending((prev) =>
        prev.map((e) =>
          e.id === id ? { ...e, id: serverId, status: "done", result, srcSetThumb } : e,
        ),
      );
      // A new row was appended to the sheet — refetch the list.
      void queryClient.invalidateQueries({ queryKey: ["entries"] });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Upload failed";
      console.error("[client] upload failed, id:", id, "error:", err);
      setPending((prev) =>
        prev.map((e) =>
          e.id === id ? { ...e, status: "error", error: msg } : e,
        ),
      );
    }
  }

  // ── Filters ─────────────────────────────────────────────────────
  const [sortAsc, setSortAsc] = useState(true); // true = oldest first (sheet order)
  const [filter, setFilter] = useState<EntryFilter>("active");
  const [filtersOpen, setFiltersOpen] = useState(false);

  const [dateStart, setDateStart] = useState("");
  const [dateEnd, setDateEnd] = useState("");

  const [amountOp, setAmountOp] = useState<NumOp>("eq");
  const [amountVal, setAmountVal] = useState("");

  const [packetsOp, setPacketsOp] = useState<NumOp>("eq");
  const [packetsVal, setPacketsVal] = useState("");

  // ── Date helpers ─────────────────────────────────────────────────
  const parseSheetDate = (s: string): number => {
    const m = s.match(/^(\d{1,2})-(\w{3})-(\d{2})$/);
    if (!m) return NaN;
    const d = new Date(`${m[2]} ${m[1]}, 20${m[3]}`);
    return d.getTime();
  };

  const parsePickerDate = (s: string): number => {
    if (!s) return NaN;
    const d = new Date(s + "T00:00:00");
    return d.getTime();
  };

  const matchesNumFilter = (value: number, op: NumOp, raw: string): boolean => {
    if (raw === "") return true;
    const target = Number(raw);
    if (Number.isNaN(target)) return true;
    if (op === "eq") return value === target;
    if (op === "gte") return value >= target;
    return value <= target;
  };

  const filteredEntries = useMemo(() => {
    return savedEntries.filter((e) => {
      if (filter === "completed" && e.totalUsed !== e.packets) return false;
      if (filter === "active" && e.totalUsed >= e.packets) return false;

      if (dateStart) {
        const ts = parseSheetDate(e.date);
        if (!Number.isNaN(ts) && ts < parsePickerDate(dateStart)) return false;
      }
      if (dateEnd) {
        const ts = parseSheetDate(e.date);
        if (!Number.isNaN(ts) && ts > parsePickerDate(dateEnd) + 86_399_999) return false;
      }

      if (!matchesNumFilter(e.amount, amountOp, amountVal)) return false;
      if (!matchesNumFilter(e.packets, packetsOp, packetsVal)) return false;

      return true;
    });
  }, [
    savedEntries,
    filter,
    dateStart,
    dateEnd,
    amountOp,
    amountVal,
    packetsOp,
    packetsVal,
  ]);

  // ── Sort by parsed date + time ─────────────────────────────────
  const entryTimestamp = (e: MilkSheetEntry): number => {
    const dateMs = parseSheetDate(e.date);
    if (Number.isNaN(dateMs)) return 0;
    const [h = "0", m = "0"] = e.time.split(":");
    return dateMs + Number(h) * 3_600_000 + Number(m) * 60_000;
  };

  const sortedEntries = useMemo(() => {
    const sorted = [...filteredEntries].sort(
      (a, b) => entryTimestamp(a) - entryTimestamp(b),
    );
    return sortAsc ? sorted : sorted.reverse();
  }, [filteredEntries, sortAsc]);

  // ── Render ──────────────────────────────────────────────────────
  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-8">
      <h1 className="mb-6 text-center text-2xl font-bold">🍼 Baby Tracker</h1>

      <SnapMilkPacketButton onFile={handleFile} />

      <PendingUploadList pending={pending} onRetry={retry} onDismiss={dismiss} />

      {/* ── Saved entries header ─────────────────────────────────── */}
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-muted-foreground">
          Saved packets
        </h2>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="ghost"
            className="h-7 px-2 text-xs"
            onClick={() => setSortAsc((prev) => !prev)}
          >
            <ArrowUpDown className="mr-1 h-3 w-3" />
            {sortAsc ? "Oldest first" : "Newest first"}
          </Button>
          <span className="text-xs text-muted-foreground">
            {sortedEntries.length}
            {filter !== "all" && ` / ${savedEntries.length}`}
          </span>
        </div>
      </div>

      <StatusFilterChips
        filter={filter}
        onFilterChange={setFilter}
        filtersOpen={filtersOpen}
        onToggleFilters={() => setFiltersOpen((p) => !p)}
      />

      {filtersOpen && (
        <AdvancedFilters
          dateStart={dateStart}
          dateEnd={dateEnd}
          onDateStartChange={setDateStart}
          onDateEndChange={setDateEnd}
          amountOp={amountOp}
          amountVal={amountVal}
          onAmountOpChange={setAmountOp}
          onAmountValChange={setAmountVal}
          packetsOp={packetsOp}
          packetsVal={packetsVal}
          onPacketsOpChange={setPacketsOp}
          onPacketsValChange={setPacketsVal}
          onClear={() => {
            setDateStart("");
            setDateEnd("");
            setAmountVal("");
            setPacketsVal("");
          }}
        />
      )}

      <StorageSummary entries={filteredEntries} />

      {/* ── Entry list ───────────────────────────────────────────── */}
      {loadError ? (
        <p className="text-center text-sm text-red-600">
          Couldn't load packets from the sheet.
        </p>
      ) : sortedEntries.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground">
          No packets in the sheet yet.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {sortedEntries.map((entry: MilkSheetEntry) => (
            <EntryCard
              key={entry.id}
              entry={entry}
            />
          ))}
        </div>
      )}
    </main>
  );
}
