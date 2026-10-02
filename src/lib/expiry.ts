import type { MilkSheetEntry } from "@/lib/sheets";
import { getFrozenMs } from "@/lib/frozen-date";

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
] as const;

/** Dedicated milk freezer storage policy. */
export const MILK_SHELF_LIFE_MONTHS = 6;
const SGT_OFFSET_MS = 8 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

/** Add calendar months in SGT, clamping to month-end and preserving freeze time. */
export function getExpiryMs(
  entry: Pick<MilkSheetEntry, "frozenAt">,
  offsetMonths = MILK_SHELF_LIFE_MONTHS,
): number {
  const freezeMs = getFrozenMs(entry);
  if (Number.isNaN(freezeMs)) return NaN;
  const date = new Date(freezeMs + SGT_OFFSET_MS);
  const day = date.getUTCDate();
  date.setUTCDate(1);
  date.setUTCMonth(date.getUTCMonth() + offsetMonths);
  const lastDay = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate();
  date.setUTCDate(Math.min(day, lastDay));
  return date.getTime() - SGT_OFFSET_MS;
}

export function daysUntilExpiry(entry: Pick<MilkSheetEntry, "frozenAt">, now = Date.now()): number {
  return Math.ceil((getExpiryMs(entry) - now) / DAY_MS);
}

/** Add calendar months to frozenAt and return its Singapore expiry month. */
export function getExpiryMonth(
  entry: MilkSheetEntry,
  offsetMonths = MILK_SHELF_LIFE_MONTHS,
): string | null {
  const expiryMs = getExpiryMs(entry, offsetMonths);
  if (Number.isNaN(expiryMs)) return null;
  const d = new Date(expiryMs + SGT_OFFSET_MS);

  return `${MONTHS[d.getUTCMonth()]}-${String(d.getUTCFullYear()).slice(2)}`;
}

/** "Oct-26" → "October 2026" */
export function formatExpiryMonth(key: string): string {
  const [mon, yy] = key.split("-");
  const idx = MONTHS.indexOf(mon as (typeof MONTHS)[number]);
  if (idx === -1) return key;
  const full = new Date(2000 + Number(yy), idx, 1).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
  return full;
}

/**
 * Add `months` to the frozenAt datetime.
 * Returns "DD-Mon-YY" (e.g., "15-Oct-26") or `null` if unparseable.
 */
export function getExpiryDate(
  entry: MilkSheetEntry,
  offsetMonths = MILK_SHELF_LIFE_MONTHS,
): string | null {
  const expiryMs = getExpiryMs(entry, offsetMonths);
  if (Number.isNaN(expiryMs)) return null;
  const d = new Date(expiryMs + SGT_OFFSET_MS);

  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${dd}-${MONTHS[d.getUTCMonth()]}-${String(d.getUTCFullYear()).slice(2)}`;
}

/** "15-Oct-26" → "15 October 2026" */
export function formatExpiryDate(dateStr: string): string {
  const m = dateStr.match(/^(\d{2})-(\w{3})-(\d{2})$/);
  if (!m) return dateStr;
  const idx = MONTHS.indexOf(m[2] as (typeof MONTHS)[number]);
  if (idx === -1) return dateStr;
  const d = new Date(2000 + Number(m[3]), idx, Number(m[1]));
  return d.toLocaleDateString("en-US", { day: "numeric", month: "long", year: "numeric" });
}

/** "16-Oct-26" → "16 Oct 2026" */
export function formatExpiryShort(dateStr: string): string {
  const m = dateStr.match(/^(\d{1,2})-(\w{3})-(\d{2})$/);
  if (!m) return dateStr;
  return `${parseInt(m[1], 10)} ${m[2]} 20${m[3]}`;
}
