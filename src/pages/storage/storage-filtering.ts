import { getFrozenMs } from "@/lib/frozen-date";
import type { MilkSheetEntry } from "@/lib/sheets";
import type { FilterState, NumOp } from "./FilterModal";

function matchesNumFilter(value: number, op: NumOp, raw: string): boolean {
  if (raw === "") return true;
  const target = Number(raw);
  if (Number.isNaN(target)) return true;
  if (op === "eq") return value === target;
  if (op === "gte") return value >= target;
  return value <= target;
}

export function filterStorageEntries(
  entries: MilkSheetEntry[],
  filter: FilterState,
): MilkSheetEntry[] {
  return entries.filter((entry) => {
    if (filter.dateStart) {
      const timestamp = getFrozenMs(entry);
      const start = Date.parse(`${filter.dateStart}T00:00:00`);
      if (!Number.isNaN(timestamp) && timestamp < start) return false;
    }
    if (filter.dateEnd) {
      const timestamp = getFrozenMs(entry);
      const end = Date.parse(`${filter.dateEnd}T00:00:00`) + 86_399_999;
      if (!Number.isNaN(timestamp) && timestamp > end) return false;
    }
    return matchesNumFilter(entry.amount, filter.amountOp, filter.amountVal);
  });
}

export function getStorageTabCounts(entries: MilkSheetEntry[]) {
  return {
    all: entries.length,
    frozen: entries.filter((entry) => !entry.used).length,
    used: entries.filter((entry) => entry.used).length,
  };
}
